"""Preserve the original USD skeletal walk as sampled glTF morph animation.

Run after convert_assets.py, passing the source rkassets directory. Sampling
evaluated USD skinning avoids a second rig implementation and preserves the
authored deformation. No procedural substitute is generated.
"""
import json, struct, sys
from pathlib import Path
import numpy as np
from pxr import Usd, UsdGeom, UsdSkel, Sdf, Gf

source = Path(sys.argv[1]).resolve()
out = Path(__file__).resolve().parents[1] / 'public/assets/models'
walk_stage = Usd.Stage.Open(str(source/'Animations/Alfa_Walk.usdc'))
walk_prim = next(p for p in walk_stage.Traverse() if p.IsA(UsdSkel.Animation))
walk_layer = walk_stage.Flatten()

for index, name in enumerate(['Fatih','Anomaly Fatih','Sandy','Anomaly Sandy','Handaru','Anomaly Handaru','Alfa','Anomaly Alfa']):
    stage = Usd.Stage.Open(Usd.Stage.Open(str(source/f'Animations/{name}.usdc')).Flatten())
    skeleton = next(p for p in stage.Traverse() if p.IsA(UsdSkel.Skeleton))
    source_skeleton = next(p for p in walk_stage.Traverse() if p.IsA(UsdSkel.Skeleton))
    assert list(UsdSkel.Skeleton(skeleton).GetJointsAttr().Get()) == list(UsdSkel.Skeleton(source_skeleton).GetJointsAttr().Get())
    destination = skeleton.GetPath().AppendChild('OriginalWalk')
    Sdf.CopySpec(walk_layer, walk_prim.GetPath(), stage.GetRootLayer(), destination)
    UsdSkel.BindingAPI(skeleton).CreateAnimationSourceRel().SetTargets([destination])
    for prim in list(stage.Traverse()):
        if prim.IsA(UsdSkel.Root):
            assert UsdSkel.BakeSkinning(Usd.PrimRange(prim), Gf.Interval(1,65))

    path = out/f'visitor-{index}.glb'
    blob = path.read_bytes(); length = struct.unpack_from('<I',blob,12)[0]
    doc = json.loads(blob[20:20+length]); binary_start = 20+length+8
    binary = bytearray(blob[binary_start:binary_start+doc['buffers'][0]['byteLength']])
    # Always start from the base exported file, not an already augmented GLB.
    assert not doc.get('animations'), 'Run convert_assets.py first to regenerate clean base assets.'
    def read_accessor(i):
        a=doc['accessors'][i]; v=doc['bufferViews'][a['bufferView']]
        return np.frombuffer(binary,dtype='<f4',offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*3).copy().reshape(-1,3)
    def add(array,kind):
        array=np.asarray(array,dtype='<f4');binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(array.tobytes())
        view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':array.nbytes})
        a={'bufferView':view,'componentType':5126,'count':len(array),'type':kind}
        a.update(min=np.atleast_1d(array.min(axis=0)).tolist(),max=np.atleast_1d(array.max(axis=0)).tolist())
        doc['accessors'].append(a);return len(doc['accessors'])-1
    def normals(positions):
        tri=positions.reshape(-1,3,3);n=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-8)
        return np.repeat(n,3,axis=0)
    frames=list(range(1,66,2));times=np.array([(f-1)/24 for f in frames]);time_accessor=add(times,'SCALAR')
    weights=add(np.eye(len(frames)).reshape(-1),'SCALAR')
    animation={'name':'Walk','samplers':[{'input':time_accessor,'output':weights,'interpolation':'LINEAR'}],'channels':[]}
    for node_index,node in enumerate(doc['nodes']):
        if 'mesh' not in node:continue
        glmesh=doc['meshes'][node['mesh']];mesh=UsdGeom.Mesh(stage.GetPrimAtPath(glmesh['name']))
        assert mesh
        indices=np.array(mesh.GetFaceVertexIndicesAttr().Get(),dtype=np.int64);corners=[];offset=0
        for count in mesh.GetFaceVertexCountsAttr().Get():
            for j in range(1,count-1):corners.extend([offset,offset+j,offset+j+1])
            offset+=count
        corners=np.array(corners)
        if mesh.GetOrientationAttr().Get()=='leftHanded':corners=corners.reshape(-1,3)[:,[0,2,1]].reshape(-1)
        primitive=glmesh['primitives'][0];base=read_accessor(primitive['attributes']['POSITION']);base_normals=normals(base)
        primitive['attributes']['NORMAL']=add(base_normals,'VEC3');primitive['targets']=[]
        maximum_motion=0
        for frame in frames:
            points=np.array(mesh.GetPointsAttr().Get(frame),dtype=np.float64)[indices[corners]]
            matrix=np.array(UsdGeom.XformCache(Usd.TimeCode(frame)).GetLocalToWorldTransform(mesh.GetPrim()))
            # einsum avoids an Accelerate/NumPy matmul warning on this host.
            positions=np.einsum('ij,jk->ik',np.c_[points,np.ones(len(points))],matrix)[:,:3]
            delta=positions-base;assert np.isfinite(delta).all();maximum_motion=max(maximum_motion,float(np.abs(delta).max()))
            primitive['targets'].append({'POSITION':add(delta,'VEC3'),'NORMAL':add(normals(positions)-base_normals,'VEC3')})
        assert maximum_motion>.05, 'Walk must deform the limbs.'
        glmesh['weights']=[0]*len(frames)
        animation['channels'].append({'sampler':0,'target':{'node':node_index,'path':'weights'}})
    doc['animations']=[animation];doc['buffers'][0]['byteLength']=len(binary)
    doc['asset']['extras']={'walkSource':'Animations/Alfa_Walk.usdc','samplingFPS':12,'sourceFPS':24,'sourceFrames':[1,65]}
    header=json.dumps(doc,separators=(',',':')).encode();header+=b' '*((-len(header))%4);binary.extend(b'\0'*((-len(binary))%4))
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(header)+len(binary))+struct.pack('<II',len(header),0x4e4f534a)+header+struct.pack('<II',len(binary),0x004e4942)+binary)
    print(path.name, 'Walk:',len(frames),'authored poses;',round(len(binary)/1e6,2),'MB',flush=True)
