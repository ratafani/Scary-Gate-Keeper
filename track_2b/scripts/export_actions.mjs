// Bake the supplied Alfa FBX rig onto the existing shared Alfa-based visitor
// geometry, preserving each visitor's materials and the original Walk clip.
// Usage: node scripts/export_actions.mjs '/path/to/Turn Jump Animation'
import fs from 'node:fs';
import path from 'node:path';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
const source=process.argv[2];if(!source)throw Error('Provide the FBX source directory');
// Textures are deliberately not imported: the shipped GLBs retain their materials.
globalThis.window={URL:{createObjectURL:()=>''}};
globalThis.document={createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(v){}})};
const out=new URL('../public/assets/models/',import.meta.url);
function loadGLB(file){const b=fs.readFileSync(file),n=b.readUInt32LE(12),doc=JSON.parse(b.subarray(20,20+n));return {doc,bin:b.subarray(28+n,28+n+doc.buffers[0].byteLength)};}
const assets=[];
for(const action of ['Jump','Turn']){
 const bytes=fs.readFileSync(path.join(source,`Alfa_${action}.fbx`));
 const scene=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 scene.updateMatrixWorld(true);let mesh;scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
 mesh.skeleton.update();const clip=scene.animations[0];if(!clip||!mesh)throw Error('Missing FBX rig or animation');
 assets.push({action,scene,mesh,clip});
}
function skin(mesh,i){
 const idx=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;
 const result=new T.Matrix4();result.elements.fill(0);
 for(let k=0;k<4;k++){
  const weight=w.getComponent(i,k);if(!weight)continue;
  const bone=idx.getComponent(i,k),m=new T.Matrix4().multiplyMatrices(mesh.skeleton.bones[bone].matrixWorld,mesh.skeleton.boneInverses[bone]);
  for(let j=0;j<16;j++)result.elements[j]+=m.elements[j]*weight;
 }
 return new T.Matrix4().copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse).multiply(result).multiply(mesh.bindMatrix);
}
for(let index=0;index<8;index++){
 const file=new URL(`visitor-${index}.glb`,out);let {doc,bin}=loadGLB(file);
 if(doc.animations.some(a=>a.name==='Jump'))throw Error('Actions already baked; restore original GLBs before rerunning');
 const nodeIndex=doc.nodes.findIndex(n=>n.mesh!==undefined),meshDoc=doc.meshes[doc.nodes[nodeIndex].mesh],p=meshDoc.primitives[0];
 function read(i){const a=doc.accessors[i],v=doc.bufferViews[a.bufferView];return new Float32Array(bin.buffer,bin.byteOffset+v.byteOffset+(a.byteOffset||0),a.count*({SCALAR:1,VEC2:2,VEC3:3}[a.type]));}
 const base=Array.from(read(p.attributes.POSITION)),uv=Array.from(read(p.attributes.TEXCOORD_0)),count=base.length/3;
 const chunks=[Buffer.from(bin)];let length=bin.length;
 function add(values,type){const a=new Float32Array(values),pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:a.byteLength});chunks.push(Buffer.from(a.buffer));length+=a.byteLength;const ac={bufferView:view,componentType:5126,count:a.length/({SCALAR:1,VEC3:3}[type]),type};if(type==='VEC3'){ac.min=[0,1,2].map(k=>Math.min(...a.filter((_,i)=>i%3===k)));ac.max=[0,1,2].map(k=>Math.max(...a.filter((_,i)=>i%3===k)));}if(type==='SCALAR'){ac.min=[Math.min(...a)];ac.max=[Math.max(...a)];}doc.accessors.push(ac);return doc.accessors.length-1;}
 const oldCount=p.targets.length;const baked=[];
 for(const {action,scene,mesh,clip} of assets){
  // All shipped visitors use this same Alfa mesh. Match UV seams and select
  // the nearest bind vertex, avoiding assumptions about FBX triangle ordering.
  const mixer=new T.AnimationMixer(scene);mixer.stopAllAction();scene.updateMatrixWorld(true);mesh.skeleton.update();
  const fuv=mesh.geometry.attributes.uv,fp=mesh.geometry.attributes.position;
  const rest=[];for(let i=0;i<fp.count;i++)rest.push(new T.Vector3().fromBufferAttribute(fp,i).applyMatrix4(skin(mesh,i)));
  const bounds=new T.Box3().setFromPoints(rest),targetBounds=new T.Box3();for(let i=0;i<count;i++)targetBounds.expandByPoint(new T.Vector3().fromArray(base,i*3));
  const scale=targetBounds.getSize(new T.Vector3()).y/bounds.getSize(new T.Vector3()).y;
  const align=new T.Matrix4().makeRotationY(-Math.PI/2).scale(new T.Vector3(scale,scale,scale));
  const center=bounds.getCenter(new T.Vector3()).applyMatrix4(align),tc=targetBounds.getCenter(new T.Vector3());align.setPosition(tc.sub(center));
  const inv=align.clone().invert(),mapping=[],bindPoints=[];
  for(let i=0;i<count;i++){
   const target=new T.Vector3().fromArray(base,i*3),u=uv[i*2],v=1-uv[i*2+1];let best=-1,dist=Infinity;
   for(let j=0;j<fp.count;j++)if(Math.abs(fuv.getX(j)-u)<1e-5&&Math.abs(fuv.getY(j)-v)<1e-5){const d=rest[j].clone().applyMatrix4(align).distanceToSquared(target);if(d<dist){dist=d;best=j;}}
   if(best<0)throw Error('No matching UV vertex');mapping.push(best);bindPoints.push(target.applyMatrix4(inv).applyMatrix4(skin(mesh,best).invert()));
  }
  const frames=Math.ceil(clip.duration*12)+1,times=Array.from({length:frames},(_,i)=>i*clip.duration/(frames-1));
  const first=p.targets.length;const act=mixer.clipAction(clip);act.setLoop(T.LoopOnce,1);act.clampWhenFinished=true;act.play();
  const heights=[];
  for(const t of times){mixer.setTime(t);scene.updateMatrixWorld(true);mesh.skeleton.update();const positions=[];
   for(let i=0;i<count;i++){const v=bindPoints[i].clone().applyMatrix4(skin(mesh,mapping[i])).applyMatrix4(align);positions.push(v.x,v.y,v.z);}
   heights.push(positions.filter((_,i)=>i%3===1).reduce((a,b)=>a+b,0)/count);
   p.targets.push({POSITION:add(positions.map((v,i)=>v-base[i]),'VEC3')});
  }
  act.stop();mixer.uncacheRoot(scene);
  baked.push({name:action,times,first,frames,apex:times[heights.indexOf(Math.max(...heights))]});
 }
 const total=p.targets.length;
 // glTF weight samplers must include the entire target vector for every clip.
 for(const anim of doc.animations){for(const sampler of anim.samplers){const values=read(sampler.output),frames=values.length/oldCount,expanded=new Float32Array(frames*total);for(let i=0;i<frames;i++)expanded.set(values.subarray(i*oldCount,(i+1)*oldCount),i*total);sampler.output=add(expanded,'SCALAR');}}
 for(const b of baked){const weights=new Float32Array(b.frames*total);for(let i=0;i<b.frames;i++)weights[i*total+b.first+i]=1;doc.animations.push({name:b.name,extras:{source:`Alfa_${b.name}.fbx`,apexTime:b.apex},samplers:[{input:add(b.times,'SCALAR'),output:add(weights,'SCALAR'),interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:nodeIndex,path:'weights'}}]});}
 meshDoc.weights=Array(total).fill(0);doc.asset.extras.actionsSource='Supplied Alfa FBX rig retargeted to shared visitor geometry';doc.buffers[0].byteLength=length;
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);let binary=Buffer.concat(chunks);binary=Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(file,Buffer.concat([header,json,bh,binary]));console.log(index,baked.map(b=>({name:b.name,apex:b.apex})),(binary.length/1e6).toFixed(1)+' MB');
}
