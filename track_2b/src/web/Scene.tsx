import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Reply, Visitor } from '../shared/types';
import { ARRIVAL_SECONDS, DEPARTURE_SECONDS, departurePosition, type Departure } from '../shared/movement';

function World({gateOpen,onDecision}:{gateOpen:boolean;onDecision:(admit:boolean)=>void}){
  const gltf=useLoader(GLTFLoader,'/assets/models/village.glb');
  const {scene,gates}=useMemo(()=>{
    const scene=gltf.scene.clone(true);const gates:THREE.Group[]=[];
    scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    for(const side of ['Left_Gate','Right_Gate']){
      const m=scene.children.find(o=>o.name.includes(side));
      if(!m)continue;
      const pivot=new THREE.Group();pivot.position.set(-5,0,side==='Left_Gate'?-9.8:-2.2);
      scene.add(pivot);pivot.attach(m);gates.push(pivot);
    }
    return {scene,gates};
  },[gltf]);
  useFrame((_,delta)=>{gates.forEach((g,i)=>{g.rotation.y=THREE.MathUtils.damp(g.rotation.y,gateOpen?(i===0?1:-1)*Math.PI/2:0,3,delta);});});
  return <primitive object={scene} onClick={(e:any)=>{const name=e.object.name;if(name.includes('Button_Green')){e.stopPropagation();onDecision(true);}else if(name.includes('Button_Red')){e.stopPropagation();onDecision(false);}}}/>;
}
function NPC({visitor,reply,departure,onDone,onReady,onDeparted}:{visitor:Visitor;reply:Reply|null;departure:Departure;onDone:()=>void;onReady:()=>void;onDeparted:()=>void}){
  const gltf=useLoader(GLTFLoader,visitor.model+'?animation=original-walk-v1');const group=useRef<THREE.Group>(null);
  const age=useRef(0);const exitAge=useRef(0);const arrived=useRef(false);const consumed=useRef('');const animation=useRef<{action:string;time:number;fall:number}|null>(null);
  const scene=useMemo(()=>{
    const scene=gltf.scene.clone(true);const box=new THREE.Box3().setFromObject(scene);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());
    const wrapper=new THREE.Group();scene.position.set(-center.x,-box.min.y,-center.z);wrapper.add(scene);wrapper.scale.setScalar(1.9/size.y);wrapper.rotation.y=Math.PI/2;
    scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return wrapper;
  },[gltf]);
  const {mixer,walk}=useMemo(()=>{
    const mixer=new THREE.AnimationMixer(scene);
    const clip=THREE.AnimationClip.findByName(gltf.animations,'Walk');
    if(!clip)throw new Error('Visitor is missing the original Walk animation.');
    const walk=mixer.clipAction(clip);walk.setLoop(THREE.LoopRepeat,Infinity);walk.play();
    return {mixer,walk};
  },[scene,gltf]);
  useEffect(()=>()=>{mixer.stopAllAction();mixer.uncacheRoot(scene);},[mixer,scene]);
  useEffect(()=>{
    if(reply&&reply.encounterId===visitor.id&&reply.id!==consumed.current){
      consumed.current=reply.id;
      if(reply.action!=='none')animation.current={action:reply.action,time:0,fall:reply.fallSeconds||0.65};
    }
  },[reply,visitor.id]);
  useFrame((_,dt)=>{
    if(!group.current)return;age.current+=Math.min(dt,.1);const g=group.current;
    const walking=departure!==null||age.current<ARRIVAL_SECONDS;
    walk.setEffectiveWeight(THREE.MathUtils.damp(walk.getEffectiveWeight(),walking?1:0,12,dt));
    mixer.update(Math.min(dt,.1));
    if(departure){
      exitAge.current+=Math.min(dt,.1);
      const [x,z]=departurePosition(departure,exitAge.current);
      g.position.set(x,-.18,z);
      g.rotation.y=THREE.MathUtils.damp(g.rotation.y,departure==='reject'?Math.PI/2:-Math.PI/2,10,dt);
      if(exitAge.current>=DEPARTURE_SECONDS)onDeparted();
      return;
    }
    g.position.z=-6-4*Math.max(0,1-age.current/ARRIVAL_SECONDS);
    if(!arrived.current&&age.current>=ARRIVAL_SECONDS){arrived.current=true;onReady();}
    const a=animation.current;
    if(a){
      a.time+=dt;
      if(a.action==='turn_around')g.rotation.y=Math.min(a.time/4,1)*Math.PI*2;
      else {const up=.45;g.position.y=-.18+(a.time<up?1.1*(1-Math.pow(1-a.time/up,2)):1.1*(1-Math.pow(Math.min((a.time-up)/a.fall,1),2)));}
      if(a.time>=(a.action==='turn_around'?4:.45+a.fall)){animation.current=null;g.position.y=-.18;g.rotation.y=0;onDone();}
    }
  });
  return <group ref={group} position={[0,-.18,-10]}><primitive object={scene}/></group>;
}
function CameraRig({playing,viewReset}:{playing:boolean;viewReset:number}){
  const {camera,gl}=useThree();const pan=useRef(0);const dragging=useRef<number|null>(null);
  useEffect(()=>{pan.current=0;dragging.current=null;},[playing,viewReset]);
  useEffect(()=>{const el=gl.domElement;const down=(e:PointerEvent)=>{dragging.current=e.clientX;};const move=(e:PointerEvent)=>{if(dragging.current!==null){pan.current=THREE.MathUtils.clamp(pan.current+(e.clientX-dragging.current)*.0015,-.16,.16);dragging.current=e.clientX;}};const up=()=>{dragging.current=null;};
    el.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{el.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};},[gl]);
  // The exported booth extends to z=-1.9. Stand beyond its front wall so
  // double-sided USD surfaces cannot hide the visitor or the village.
  useFrame(()=>{camera.position.set(playing?0:2.6,playing?1.65:2.4,playing?-2.3:4);camera.lookAt(playing?Math.sin(pan.current)*4:-1,playing?1.05:1,playing?-6.3:-6);});return null;
}
export default function Scene({visitor,reply,departure,playing,viewReset,onDone,onReady,onDeparted,onDecision}:{visitor:Visitor|null;reply:Reply|null;departure:Departure;playing:boolean;viewReset:number;onDone:()=>void;onReady:()=>void;onDeparted:()=>void;onDecision:(v:boolean)=>void}){
  return <Canvas shadows dpr={[1,1.5]} camera={{fov:55,near:.1,far:140}} gl={{antialias:true}}>
    <color attach="background" args={['#101f25']}/><fog attach="fog" args={['#101f25',15,65]}/>
    <hemisphereLight args={['#a7c2cf','#394235',2.1]}/>
    <directionalLight position={[-8,14,5]} intensity={2.2} color="#b6d4ed" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20}/>
    <pointLight position={[-.3,2.3,-.2]} color="#ffce83" intensity={22} distance={12} decay={2}/>
    <pointLight position={[3.4,4,-1]} color="#ffda99" intensity={40} distance={16}/>
    <pointLight position={[-2,4,-12]} color="#d5dfaa" intensity={35} distance={15}/>
    <CameraRig playing={playing} viewReset={viewReset}/>
    <Suspense fallback={null}><World gateOpen={departure==='admit'} onDecision={onDecision}/>{visitor&&<NPC key={visitor.id} visitor={visitor} reply={reply} departure={departure} onDone={onDone} onReady={onReady} onDeparted={onDeparted}/>}</Suspense>
  </Canvas>;
}
