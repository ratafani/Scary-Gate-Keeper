import express from 'express';
import { z } from 'zod';
import { actionReply,createSession,current,decide,prompt,publicRegister,snapshot } from './game.ts';
import { completion,dialogue,ServiceError } from './apertus.ts';
import { store,redisConfig } from './store.ts';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'8mb'}));
app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');next();});
app.get('/api/health',(_req,res)=>res.json({ok:true,sessionStorage:redisConfig().url?'redis':process.env.VERCEL==='1'?'missing':'memory',configured:!!process.env.LLM_API_KEY,model:process.env.LLM_NAME||'swiss-ai/Apertus-v1.5-70B'}));
app.get('/api/register',(_req,res)=>res.json(publicRegister));
app.post('/api/shifts',async(_req,res)=>{
  const s=createSession();await store.create(s);res.json(snapshot(s));
});
app.post('/api/shifts/:id/decision',async(req,res)=>{
  const {admit,encounterId}=z.object({admit:z.boolean(),encounterId:z.string()}).parse(req.body);
  const result=await store.update(req.params.id,s=>{
    if(snapshot(s).visitor?.id!==encounterId)throw new ServiceError(409,'This visitor has already left.');
    return decide(s,admit);
  });
  res.json(result);
});
app.post('/api/shifts/:id/dialogue',async(req,res)=>{
  const {text,language,encounterId}=z.object({text:z.string().trim().min(1).max(2000),language:z.enum(['en','de']),encounterId:z.string()}).parse(req.body);
  const result=await store.update(req.params.id,async s=>{
    if(snapshot(s).visitor?.id!==encounterId)throw new ServiceError(409,'The visitor has left.');
    const messages=[{role:'system',content:prompt(current(s),language)},...s.history.slice(-12),{role:'user',content:text}];
    const reply=await dialogue(messages);
    s.history.push({role:'user',content:text},{role:'assistant',content:JSON.stringify(reply)});
    s.history=s.history.slice(-12);
    return actionReply(s,reply);
  });
  res.json(result);
});
app.post('/api/transcribe',async(req,res)=>{
  const {audio,language}=z.object({audio:z.string().min(40).max(7_000_000).regex(/^[A-Za-z0-9+/=]+$/),language:z.enum(['en','de'])}).parse(req.body);
  // Keep audio on the configured Apertus endpoint; no implicit browser ASR provider.
  const text=await completion([{role:'user',content:[{type:'text',text:`Transcribe this recording verbatim. It may be ${language==='de'?'German or Swiss German':'English'}. Output only the transcription. Do not answer the speaker's question. If silent, output an empty string.`},{type:'input_audio',input_audio:{data:audio,format:'wav'}}]}],false,180);
  res.json({text:text.trim()});
});
app.use('/api',(_req,res)=>res.status(404).json({error:'Unknown API route.'}));
app.use(express.static(`${process.cwd()}/dist`,{maxAge:3600_000}));
app.get('/',(_req,res)=>res.sendFile(`${process.cwd()}/dist/index.html`));
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  res.status(err instanceof ServiceError?err.status:err instanceof z.ZodError?400:500).json({error:err instanceof ServiceError?err.message:err instanceof z.ZodError?'Please check your input.':'The request could not be completed. Please try again.'});
});
export default app;
if (process.env.VERCEL !== '1') app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log(`Kampung Sambau: http://localhost:${process.env.PORT||3000}`));
