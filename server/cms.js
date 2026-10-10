import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { put, list, del } from '@vercel/blob';
import { defaults, validateContent } from '../src/lib/content-schema.js';
export const COOKIE='bruzovice_admin';
const SESSION_HOURS=12;
const KEEP_VERSIONS=30;
export class CmsError extends Error { constructor(message,status=500) { super(message);this.status=status; } }
export const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
function blobToken(){
  const token=process.env.BLOB_READ_WRITE_TOKEN;
  if(!token)throw new CmsError('Úložiště administrace zatím není připojené. Ve Vercelu připojte Blob úložiště k projektu.',503);
  return token;
}
// Each save writes a new numbered file, so readers never see a stale CDN copy and older versions stay as history.
const versionPath=revision=>`cms/content-${String(revision).padStart(8,'0')}.json`;
async function versions(){
  try{
    const {blobs}=await list({prefix:'cms/content-',limit:1000,token:blobToken()});
    return blobs.map(blob=>({...blob,revision:Number(blob.pathname.match(/content-(\d+)\.json$/)?.[1])})).filter(blob=>blob.revision>0).sort((a,b)=>b.revision-a.revision);
  }catch(error){if(error instanceof CmsError)throw error;throw new CmsError('Úložiště teď není dostupné. Změny zůstaly v editoru; zkuste to znovu.',503);}
}
export async function readContent(){
  const [latest]=await versions();
  if(!latest)return {content:structuredClone(defaults),revision:0};
  const response=await fetch(latest.url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new CmsError('Úložiště teď není dostupné. Zkuste to znovu.',503);
  const content=await response.json();
  if(!validateContent(content).valid)throw new CmsError('Uložený obsah má neplatný formát.',500);
  return {content,revision:latest.revision,updatedAt:latest.uploadedAt instanceof Date?latest.uploadedAt.toISOString():latest.uploadedAt};
}
export async function saveContent(content,revision){
  const checked=validateContent(content);
  if(!checked.valid)throw new CmsError(checked.errors.slice(0,4).join(' '),400);
  if(!Number.isSafeInteger(revision)||revision<0)throw new CmsError('Neplatná verze obsahu.',400);
  const existing=await versions();
  const conflict=new CmsError('Obsah mezitím upravil jiný správce. Stáhněte zálohu úprav a načtěte aktuální verzi.',409);
  if((existing[0]?.revision||0)!==revision)throw conflict;
  try{
    // allowOverwrite:false makes the write fail if a concurrent save already created this revision.
    await put(versionPath(revision+1),JSON.stringify(content),{access:'public',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false,token:blobToken()});
  }catch(error){
    if(error instanceof CmsError)throw error;
    if(/already exists/i.test(error?.message||''))throw conflict;
    throw new CmsError('Uložení se nezdařilo. Vaše změny zůstaly v editoru.',503);
  }
  const old=existing.slice(KEEP_VERSIONS-1).map(blob=>blob.url);
  if(old.length)await del(old,{token:blobToken()}).catch(()=>{});
  return {revision:revision+1,updatedAt:new Date().toISOString()};
}
export function sameOrigin(request){
  const u=new URL(request.url);
  const host=request.headers.get('x-forwarded-host')||request.headers.get('host')||u.host;
  const proto=request.headers.get('x-forwarded-proto')||u.protocol.slice(0,-1);
  return request.headers.get('origin')===`${proto}://${host}` && request.headers.get('sec-fetch-site')!=='cross-site';
}
export async function readJson(request,max=400_000){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new CmsError('Očekáván formát JSON.',415);
  if(Number(request.headers.get('content-length'))>max)throw new CmsError('Data jsou příliš velká.',413);
  let size=0;const chunks=[];const reader=request.body?.getReader();
  if(!reader)throw new CmsError('Chybí data.',400);
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new CmsError('Data jsou příliš velká.',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new CmsError('Neplatná data.',400);}
}
function authConfig(){
  const stored=process.env.ADMIN_PASSWORD_HASH,secret=process.env.ADMIN_SESSION_SECRET;
  if(!stored||!secret)throw new CmsError('Přihlášení není nastavené na serveru.',503);
  const [salt,expected]=stored.split(':');
  if(!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(expected||''))throw new CmsError('Nastavení přihlášení není platné.',503);
  return {salt,expected,secret,stored};
}
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')}`;}
export function verifyPassword(username,password){
  const {salt,expected}=authConfig();
  if(typeof password!=='string'||password.length>200||username!=='admin')return false;
  return timingSafeEqual(scryptSync(password,Buffer.from(salt,'hex'),64),Buffer.from(expected,'hex'));
}
// Stateless signed session: changing the password or the secret signs everyone out.
const sign=expires=>{const {secret,stored}=authConfig();return createHmac('sha256',`${secret}:${stored}`).update(`session:${expires}`).digest('hex');};
export function createSession(now=Date.now()){const expires=now+SESSION_HOURS*3600000;return `${expires}.${sign(expires)}`;}
export function sessionToken(request){return request.headers.get('cookie')?.match(/(?:^|;\s*)bruzovice_admin=(\d{13}\.[a-f0-9]{64})(?:;|$)/)?.[1]||'';}
export function requireSession(request){
  const token=sessionToken(request);if(!token)throw new CmsError('Přihlaste se prosím.',401);
  const [expires,signature]=token.split('.');
  const valid=timingSafeEqual(Buffer.from(sign(Number(expires)),'hex'),Buffer.from(signature,'hex'));
  if(!valid||Number(expires)<=Date.now())throw new CmsError('Přihlášení vypršelo. Přihlaste se znovu; vaše úpravy zůstaly v editoru.',401);
  return token;
}
export function cookie(request,token,maxAge=SESSION_HOURS*3600){
  const secure=new URL(request.url).protocol==='https:'||request.headers.get('x-forwarded-proto')==='https';
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
// Best-effort brake per server instance; scrypt already makes guessing slow.
const attempts=new Map();
export async function login(request,username,password){
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const now=Date.now(),entry=attempts.get(ip);
  const current=entry&&now-entry.start<15*60000?entry:{start:now,count:0};
  if(current.count>=10)throw new CmsError('Příliš mnoho pokusů. Zkuste přihlášení za 15 minut.',429);
  if(!verifyPassword(username,password)){
    current.count++;attempts.set(ip,current);
    if(attempts.size>5000)attempts.clear();
    throw new CmsError('Nesprávné přihlašovací jméno nebo heslo.',401);
  }
  attempts.delete(ip);
  return createSession(now);
}
export const uploadRules={
  photos:{pattern:/^photos\/[a-f0-9-]{36}\.webp$/,types:['image/webp'],max:5_000_000},
  videos:{pattern:/^videos\/[a-f0-9-]{36}\.(mp4|webm)$/,types:['video/mp4','video/webm'],max:300_000_000},
};
// Files go straight from the browser to Blob storage; this only issues a short-lived token for one allowed path.
export function uploadPermission(pathname){
  const rule=Object.values(uploadRules).find(r=>r.pattern.test(pathname));
  if(!rule)throw new CmsError('Tento typ souboru nelze nahrát.',400);
  return {allowedContentTypes:rule.types,maximumSizeInBytes:rule.max,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+30*60000};
}
