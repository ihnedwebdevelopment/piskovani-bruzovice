import { json, CmsError, sameOrigin, readJson, requireSession, readContent, saveContent, login, logout, cookie, uploadImage } from '../server/cms.js';
const failure=error=>json({message:error instanceof CmsError?error.message:'Operaci se nepodařilo dokončit. Zkuste to znovu.'},error instanceof CmsError?error.status:503);
export async function GET(request){try{await requireSession(request);return json(await readContent());}catch(error){return failure(error);}}
export async function POST(request){
  try{
    if(!sameOrigin(request))throw new CmsError('Operaci proveďte přímo v administraci webu.',403);
    const action=new URL(request.url).searchParams.get('action');
    if(action==='login'){
      const {username,password}=await readJson(request,2048);
      const token=await login(request,username,password);
      return json({ok:true},200,{'Set-Cookie':cookie(request,token)});
    }
    if(action==='logout'){await logout(request);return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});}
    await requireSession(request);
    if(action==='save'){const input=await readJson(request,400000);return json(await saveContent(input.content,input.revision));}
    if(action==='upload')return json(await uploadImage(await readJson(request)));
    throw new CmsError('Neznámá operace.',400);
  }catch(error){return failure(error);}
}
