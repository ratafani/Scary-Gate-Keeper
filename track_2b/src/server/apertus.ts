import { parseReply } from './game.ts';
export class ServiceError extends Error { constructor(public status:number,message:string){super(message);} }
export async function completion(messages:unknown[],json=true,maxTokens=240):Promise<string>{
  if(!process.env.LLM_API_KEY)throw new ServiceError(503,'Set LLM_API_KEY in the server environment to connect Apertus.');
  let response:Response;
  try {
    response=await fetch(`${(process.env.LLM_BASE_URL||'https://api.inference.cscs.ch/v1').replace(/\/$/,'')}/chat/completions`,{
      method:'POST',headers:{Authorization:`Bearer ${process.env.LLM_API_KEY}`,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(45000),
      body:JSON.stringify({model:process.env.LLM_NAME||'swiss-ai/Apertus-v1.5-70B',messages,max_tokens:maxTokens,temperature:0.35,stream:false,...(json?{response_format:{type:'json_object'}}:{})})});
  } catch {throw new ServiceError(504,'Apertus could not be reached. Please try again.');}
  if(!response.ok)throw new ServiceError(502,`Apertus returned HTTP ${response.status}. Check the endpoint, model and key.`);
  const body=await response.json();const choice=body.choices?.[0];
  if(choice?.finish_reason==='length')throw new ServiceError(502,'Apertus reached its reply limit. Please try a shorter question.');
  if(typeof choice?.message?.content!=='string')throw new ServiceError(502,'Apertus returned no usable text.');
  return choice.message.content;
}
export async function dialogue(messages:{role:string;content:string}[]){
  const raw=await completion(messages);
  try{return parseReply(raw);}catch{
    const repaired=await completion([...messages,{role:'assistant',content:raw},{role:'user',content:'Your previous response was invalid. Re-answer my preceding request as exactly {"speech":"...","action":"none|turn_around|jump"}. Choose the action that fulfills that request. No markdown or additional keys.'}]);
    try{return parseReply(repaired);}catch{throw new ServiceError(502,'The visitor returned an invalid action response. Please try again.');}
  }
}
