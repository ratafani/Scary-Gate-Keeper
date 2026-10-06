import express from 'express';
import { z } from 'zod';
import { actionReply,createSession,current,decide,prompt,publicRegister,sessions,snapshot } from './game.ts';
import { completion,dialogue,ServiceError } from './apertus.ts';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'8mb'}));
app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');next();});
app.get('/api/health',(_req,res)=>res.json({ok:true,configured:!!process.env.LLM_API_KEY,model:process.env.LLM_NAME||'swiss-ai/Apertus-v1.5-70B'}));
app.get('/api/register',(_req,res)=>res.json(publicRegister));
app.post('/api/shifts',(_req,res)=>{
  for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id);
  if(sessions.size>=500)throw new ServiceError(503,'The game is busy. Please try again later.');
  res.json(snapshot(createSession()));
});
app.use('/api/shifts/:id',(req,res,next)=>{const s=sessions.get(req.params.id);if(!s||s.expires<Date.now())return res.status(404).json({error:'Your shift expired. Start a new shift.'});res.locals.session=s;next();});
app.post('/api/shifts/:id/decision',(req,res)=>{
  const {admit,encounterId}=z.object({admit:z.boolean(),encounterId:z.string()}).parse(req.body);
  const s=res.locals.session;if(snapshot(s).visitor?.id!==encounterId)throw new ServiceError(409,'This visitor has already left.');
  res.json(decide(s,admit));
});
app.post('/api/shifts/:id/dialogue',async(req,res)=>{
  const {text,language,encounterId}=z.object({text:z.string().trim().min(1).max(2000),language:z.enum(['en','de']),encounterId:z.string()}).parse(req.body);
  const s=res.locals.session;
  if(s.busy||snapshot(s).visitor?.id!==encounterId)throw new ServiceError(409,'The visitor is busy or has left.');
  s.busy=true;
  try{
    const messages=[{role:'system',content:prompt(current(s),language)},...s.history.slice(-12),{role:'user',content:text}];
    const result=await dialogue(messages);
    if(snapshot(s).visitor?.id!==encounterId)throw new ServiceError(409,'The visitor has left.');
    s.history.push({role:'user',content:text},{role:'assistant',content:JSON.stringify(result)});
    res.json(actionReply(s,result));
  }finally{s.busy=false;}
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
