// Record PCM locally and send WAV only to the configured Apertus service.
export async function recordWav(){
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const context=new AudioContext({sampleRate:16000});await context.resume();
  const source=context.createMediaStreamSource(stream);const recorder=context.createScriptProcessor(4096,1,1);
  const mute=context.createGain();mute.gain.value=0;const chunks:Float32Array[]=[];
  recorder.onaudioprocess=e=>chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(recorder);recorder.connect(mute);mute.connect(context.destination);
  let stopped=false;
  return async()=>{
    if(stopped)return '';stopped=true;
    recorder.disconnect();source.disconnect();mute.disconnect();stream.getTracks().forEach(t=>t.stop());
    const rate=context.sampleRate;await context.close();
    const n=chunks.reduce((a,c)=>a+c.length,0);const buffer=new ArrayBuffer(44+n*2);const v=new DataView(buffer);
    const str=(o:number,s:string)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
    str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
    let offset=44;for(const c of chunks)for(const x of c){v.setInt16(offset,Math.max(-1,Math.min(1,x))*32767,true);offset+=2;}
    const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
  };
}
