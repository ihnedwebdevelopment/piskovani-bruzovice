import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { defaults, validateContent } from '../src/lib/content-schema.js';
export const COOKIE='bruzovice_admin';
export class CmsError extends Error { constructor(message,status=500) { super(message);this.status=status; } }
export const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function config(){
  const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new CmsError('Úložiště administrace zatím není připojené. Doplňte serverové nastavení Supabase.',503);
  return {url,key};
}
export async function db(path,options={}){
  const {url,key}=config();
  const response=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new CmsError('Úložiště teď není dostupné. Změny zůstaly v editoru; zkuste to znovu.',503);
  const text=await response.text();return text?JSON.parse(text):null;
}
export async function readContent(){
  const rows=await db('bruzovice_content?id=eq.main&select=data,revision,updated_at');
  if(!rows.length)return {content:structuredClone(defaults),revision:0};
  if(!validateContent(rows[0].data).valid)throw new CmsError('Uložený obsah má neplatný formát.',500);
  return {content:rows[0].data,revision:rows[0].revision,updatedAt:rows[0].updated_at};
}
export async function saveContent(content,revision){
  const checked=validateContent(content);
  if(!checked.valid)throw new CmsError(checked.errors.slice(0,4).join(' '),400);
  if(!Number.isSafeInteger(revision)||revision<0)throw new CmsError('Neplatná verze obsahu.',400);
  const updatedAt=new Date().toISOString();
  const options={headers:{Prefer:'return=representation'},body:JSON.stringify({data:content,revision:revision+1,updated_at:updatedAt})};
  let rows;
  if(revision===0){
    // Seed once; competing editors must reload, never overwrite a newer version.
    const {url,key}=config();
    const response=await fetch(`${url}/rest/v1/bruzovice_content`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({id:'main',data:content,revision:1,updated_at:updatedAt}),signal:AbortSignal.timeout(12000)});
    if(response.status===409)throw new CmsError('Obsah mezitím upravil jiný správce. Stáhněte zálohu úprav a načtěte aktuální verzi.',409);
    if(!response.ok)throw new CmsError('Uložení se nezdařilo. Vaše změny zůstaly v editoru.',503);
    rows=await response.json();
  }else rows=await db(`bruzovice_content?id=eq.main&revision=eq.${revision}`,{method:'PATCH',...options});
  if(!rows?.length)throw new CmsError('Obsah mezitím upravil jiný správce. Stáhněte zálohu úprav a načtěte aktuální verzi.',409);
  return {revision:rows[0].revision,updatedAt};
}
export function sameOrigin(request){
  const u=new URL(request.url);
  const host=request.headers.get('x-forwarded-host')||request.headers.get('host')||u.host;
  const proto=request.headers.get('x-forwarded-proto')||u.protocol.slice(0,-1);
  return request.headers.get('origin')===`${proto}://${host}` && request.headers.get('sec-fetch-site')!=='cross-site';
}
export async function readJson(request,max=4_200_000){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new CmsError('Očekáván formát JSON.',415);
  if(Number(request.headers.get('content-length'))>max)throw new CmsError('Soubor je příliš velký.',413);
  let size=0;const chunks=[];const reader=request.body?.getReader();
  if(!reader)throw new CmsError('Chybí data.',400);
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new CmsError('Soubor je příliš velký.',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new CmsError('Neplatná data.',400);}
}
export function verifyPassword(username,password){
  const stored=process.env.ADMIN_PASSWORD_HASH;
  if(!stored||!process.env.ADMIN_SESSION_SECRET)throw new CmsError('Přihlášení není nastavené na serveru.',503);
  if(typeof password!=='string'||password.length>200||username!=='admin')return false;
  const [salt,expected]=stored.split(':');
  if(!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(expected||''))throw new CmsError('Nastavení přihlášení není platné.',503);
  return timingSafeEqual(scryptSync(password,Buffer.from(salt,'hex'),64),Buffer.from(expected,'hex'));
}
export function sessionToken(request){const match=request.headers.get('cookie')?.match(/(?:^|;\s*)bruzovice_admin=([a-f0-9]{64})(?:;|$)/);return match?.[1]||'';}
export const sessionHash=token=>sha(`${token}:${process.env.ADMIN_SESSION_SECRET}:${process.env.ADMIN_PASSWORD_HASH}`);
export async function requireSession(request){
  const token=sessionToken(request);if(!token)throw new CmsError('Přihlaste se prosím.',401);
  const rows=await db(`bruzovice_sessions?token_hash=eq.${sessionHash(token)}&select=expires_at`);
  if(!rows.length||new Date(rows[0].expires_at)<=new Date())throw new CmsError('Přihlášení vypršelo. Přihlaste se znovu; vaše úpravy zůstaly v editoru.',401);
  return token;
}
export function cookie(request,token,maxAge=28800){
  const secure=new URL(request.url).protocol==='https:'||request.headers.get('x-forwarded-proto')==='https';
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
export async function login(request,username,password){
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const key=sha(`${ip}:${process.env.ADMIN_SESSION_SECRET}`);
  const allowed=await db('rpc/bruzovice_login_quota',{method:'POST',body:JSON.stringify({client_key:key})});
  if(!allowed)throw new CmsError('Příliš mnoho pokusů. Zkuste přihlášení za 15 minut.',429);
  if(!verifyPassword(username,password))throw new CmsError('Nesprávné přihlašovací jméno nebo heslo.',401);
  const token=randomBytes(32).toString('hex');
  await db('bruzovice_sessions',{method:'POST',body:JSON.stringify({token_hash:sessionHash(token),expires_at:new Date(Date.now()+8*3600000).toISOString()})});
  return token;
}
export async function logout(request){const token=sessionToken(request);if(token)await db(`bruzovice_sessions?token_hash=eq.${sessionHash(token)}`,{method:'DELETE'});}
export async function uploadImage(input){
  if(typeof input.data!=='string'||input.data.length>4_000_000||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw new CmsError('Fotografie je příliš velká nebo poškozená.',400);
  const bytes=Buffer.from(input.data,'base64');
  let type,extension;
  if(bytes.length>12&&bytes.subarray(0,3).equals(Buffer.from([255,216,255]))){type='image/jpeg';extension='jpg';}
  else if(bytes.length>12&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){type='image/png';extension='png';}
  else if(bytes.length>12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){type='image/webp';extension='webp';}
  else throw new CmsError('Nahrajte fotografii JPG, PNG nebo WebP.',400);
  if(bytes.length>3_000_000)throw new CmsError('Fotografie smí mít nejvýše 3 MB.',413);
  const {url,key}=config();const path=`photos/${randomBytes(16).toString('hex')}.${extension}`;
  const response=await fetch(`${url}/storage/v1/object/bruzovice-media/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':type,'Cache-Control':'31536000','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new CmsError('Fotografii se nepodařilo nahrát. Zkuste to znovu.',503);
  return {url:`${url}/storage/v1/object/public/bruzovice-media/${path}`};
}
