"""Convert owned RCP meshes to GLB. Requires usd-core, numpy, Pillow.
Usage: python scripts/convert_assets.py /path/to/RealityKitContent.rkassets
RCP behaviors are intentionally omitted. Characters use a baked first-frame pose.
"""
import sys, json, struct, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from pxr import Usd, UsdGeom, UsdShade, UsdSkel, Gf

SOURCE = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parents[1] / 'public/assets'
(OUT / 'models').mkdir(parents=True, exist_ok=True)
(OUT / 'textures').mkdir(exist_ok=True)
texture_cache = {}

def texture(asset):
    path = Path(asset.resolvedPath or asset.path)
    if not path.exists():
        candidates = list(SOURCE.rglob(Path(asset.path.replace('<UDIM>', '1001')).name))
        if not candidates: return None
        path = candidates[0]
    if str(path) not in texture_cache:
        name = hashlib.sha256(str(path.relative_to(SOURCE)).encode()).hexdigest()[:12]+'.webp'
        im = Image.open(path)
        im.thumbnail((1024,1024))
        # PNG is used in GLB for widest loader support.
        name = name.replace('.webp', '.png')
        im.save(OUT/'textures'/name, optimize=True)
        texture_cache[str(path)] = name
    return texture_cache[str(path)]

def convert(relative, name, character=False):
    stage = Usd.Stage.Open(str(SOURCE/relative))
    time = Usd.TimeCode(1) if character else Usd.TimeCode.Default()
    if character:
        # Bake to an anonymous layer, never edit the source files.
        stage = Usd.Stage.Open(stage.Flatten())
        for prim in list(stage.Traverse()):
            if prim.IsA(UsdSkel.Root):
                UsdSkel.BakeSkinning(Usd.PrimRange(prim), Gf.Interval(1,1))
    doc = {'asset':{'version':'2.0','generator':'Kampung Sambau USD converter'},'scene':0,'scenes':[{'nodes':[]}],
           'nodes':[],'meshes':[],'materials':[],'textures':[],'images':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]}
    data=bytearray(); mats={}; cache=UsdGeom.XformCache(time)
    def accessor(array, kind):
        while len(data)%4: data.append(0)
        a=np.asarray(array,dtype='<f4'); start=len(data); data.extend(a.tobytes())
        vi=len(doc['bufferViews']); doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':a.nbytes})
        ac={'bufferView':vi,'componentType':5126,'count':len(a),'type':kind}
        if kind=='VEC3': ac.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
        doc['accessors'].append(ac); return len(doc['accessors'])-1
    def material(prim):
        mat,_=UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()
        key=str(mat.GetPath()) if mat else 'default'
        if key in mats: return mats[key]
        pbr={'baseColorFactor':[0.58,0.61,0.57,1],'roughnessFactor':0.9,'metallicFactor':0}
        tex=None
        if mat:
            baked=mat.GetPrim().GetAttribute('inputs:BakedTexture').Get()
            if baked: tex=texture(baked)
            if not tex:
                for child in Usd.PrimRange(mat.GetPrim()):
                    attr=child.GetAttribute('inputs:file').Get()
                    if attr:
                        tex=texture(attr)
                        if tex: break
        if tex:
            ti=len(doc['textures']); doc['images'].append({'uri':'../textures/'+tex}); doc['textures'].append({'source':len(doc['images'])-1})
            pbr.update(baseColorFactor=[1,1,1,1],baseColorTexture={'index':ti})
        result={'name':key,'pbrMetallicRoughness':pbr,'doubleSided':True}
        mats[key]=len(doc['materials']); doc['materials'].append(result); return mats[key]
    bounds=[]
    for prim in stage.Traverse():
        if not prim.IsA(UsdGeom.Mesh): continue
        path=str(prim.GetPath())
        if any(x in path for x in ['SkySphere','SkyDome']): continue
        mesh=UsdGeom.Mesh(prim)
        if UsdGeom.Imageable(prim).ComputeVisibility(time)=='invisible': continue
        pts=np.asarray(mesh.GetPointsAttr().Get(time),dtype=np.float64)
        if not len(pts): continue
        faces=list(mesh.GetFaceVertexCountsAttr().Get()); inds=np.asarray(mesh.GetFaceVertexIndicesAttr().Get(),dtype=np.int64)
        uv=UsdGeom.PrimvarsAPI(prim).GetPrimvar('st')
        if not uv:
            uv=next((p for p in UsdGeom.PrimvarsAPI(prim).GetPrimvars() if str(p.GetTypeName())=='texCoord2f[]'),None)
        uvs=np.asarray(uv.ComputeFlattened(time),dtype=np.float32) if uv and uv.HasValue() else None
        interp=str(uv.GetInterpolation()) if uv else ''
        triangles=[]; offset=0; face_ids=[]
        for fi,count in enumerate(faces):
            for j in range(1,count-1):
                triangles.extend([offset,offset+j,offset+j+1]);face_ids.extend([fi]*3)
            offset+=count
        corners=np.asarray(triangles,dtype=np.int64)
        expanded=pts[inds[corners]]
        matrix=np.array(cache.GetLocalToWorldTransform(prim))
        positions=(np.c_[expanded,np.ones(len(expanded))]@matrix)[:,:3]
        if mesh.GetOrientationAttr().Get()=='leftHanded':
            positions=positions.reshape(-1,3,3)[:,[0,2,1],:].reshape(-1,3)
            corners=corners.reshape(-1,3)[:,[0,2,1]].reshape(-1)
        attrs={'POSITION':accessor(positions,'VEC3')}
        if uvs is not None and len(uvs):
            if interp=='faceVarying': coords=uvs[corners]
            elif interp in ('vertex','varying'): coords=uvs[inds[corners]]
            elif interp=='uniform': coords=uvs[np.array(face_ids)]
            else: coords=np.tile(uvs[0],(len(corners),1))
            coords=coords.copy();coords[:,1]=1-coords[:,1]
            attrs['TEXCOORD_0']=accessor(coords,'VEC2')
        doc['meshes'].append({'name':path,'primitives':[{'attributes':attrs,'material':material(prim)}]})
        doc['nodes'].append({'name':path,'mesh':len(doc['meshes'])-1})
        doc['scenes'][0]['nodes'].append(len(doc['nodes'])-1)
        bounds.extend([positions.min(axis=0),positions.max(axis=0)])
    doc['buffers'][0]['byteLength']=len(data)
    j=json.dumps(doc,separators=(',',':')).encode()
    j+=b' '*((-len(j))%4); data+=b'\0'*((-len(data))%4)
    blob=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data
    (OUT/'models'/f'{name}.glb').write_bytes(blob)
    b=np.array(bounds)
    print(name,len(doc['meshes']),'meshes',round(len(blob)/1e6,2),'MB',b.min(axis=0).round(2),b.max(axis=0).round(2),flush=True)

convert('Scenes/EnviScene 1.usda','village')
for i,name in enumerate(['Fatih','Anomaly Fatih','Sandy','Anomaly Sandy','Handaru','Anomaly Handaru','Alfa','Anomaly Alfa']):
    convert('Animations/'+name+'.usdc',f'visitor-{i}',True)
for name in ['Fatih','Sandy','Handaru','Alfa']:
    p=next((SOURCE/'Texture/Cards').glob(f'*{name}*BaseColor.1001.png'))
    im=Image.open(p);im.thumbnail((1024,1024));im.save(OUT/f'card-{name.lower()}.png')
(OUT/'conversion-manifest.json').write_text(json.dumps({'source':'NeighborhoodWatchVision / RealityKitContent.rkassets','characterPose':'Baked frame 1; movement driven by browser','textures':{str(Path(k).relative_to(SOURCE)):v for k,v in texture_cache.items()}},indent=2))
