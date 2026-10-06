import test from 'node:test';
import assert from 'node:assert/strict';
import {departurePosition,DEPARTURE_SECONDS} from '../shared/movement.ts';
import {readFileSync} from 'node:fs';
import {AnimationMixer, Mesh, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
test('Rejected visitors walk right and never cross the gate',()=>{
  let previous=0;
  for(let t=0;t<=DEPARTURE_SECONDS;t+=.05){const [x,z]=departurePosition('reject',t);assert.ok(x>=previous&&x>-5);assert.equal(z,-6);previous=x;}
  assert.deepEqual(departurePosition('reject',DEPARTURE_SECONDS),[8,-6]);
  assert.ok(departurePosition('admit',DEPARTURE_SECONDS)[0]<-5);
});
test('Every visitor contains a nonconstant authored Walk clip',()=>{
  for(let i=0;i<8;i++){
    const b=readFileSync(new URL(`../../public/assets/models/visitor-${i}.glb`,import.meta.url));
    const n=b.readUInt32LE(12);const gltf=JSON.parse(b.subarray(20,20+n).toString());
    assert.equal(gltf.animations[0].name,'Walk');
    assert.equal(gltf.asset.extras.walkSource,'Animations/Alfa_Walk.usdc');
    const targets=gltf.meshes[0].primitives[0].targets;assert.equal(targets.length,33);
    const bytes=(accessor:number)=>{const a=gltf.accessors[accessor];const v=gltf.bufferViews[a.bufferView];return b.subarray(28+n+v.byteOffset,28+n+v.byteOffset+v.byteLength);};
    assert.notDeepEqual(bytes(targets[0].POSITION),bytes(targets[8].POSITION));
  }
});
test('Three.js plays the exported clip and deforms vertices on a cloned visitor',async()=>{
  const b=readFileSync(new URL('../../public/assets/models/visitor-0.glb',import.meta.url));
  const n=b.readUInt32LE(12);const doc=JSON.parse(b.subarray(20,20+n).toString());
  // Rendering textures needs a browser; strip only material resources for this
  // animation-loader check and retain the shipped geometry and animation data.
  delete doc.images;delete doc.textures;delete doc.materials;
  for(const m of doc.meshes)for(const p of m.primitives)delete p.material;
  const json=Buffer.from(JSON.stringify(doc));const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const binary=b.subarray(28+n);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  const glb=Buffer.concat([header,padded,binHeader,binary]);
  const loaded=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength) as ArrayBuffer,'');
  const scene=loaded.scene.clone(true);const mixer=new AnimationMixer(scene);mixer.clipAction(loaded.animations[0]).play();
  const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
  const mesh=meshes[0];const vertex=(i:number)=>mesh.getVertexPosition(i,new Vector3());
  mixer.setTime(.2);const first=Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>vertex(i));
  mixer.setTime(.8);let changed=0;
  first.forEach((p,i)=>{if(p.distanceTo(vertex(i))>.02)changed++;});
  assert.ok(changed>100,`Expected moving limbs, got ${changed} changed vertices`);
  assert.equal(scene.position.length(),0,'The animation deforms the mesh instead of jiggling its root');
});
