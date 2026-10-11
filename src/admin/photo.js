// Turns any photo the phone or computer offers into a web-sized WebP before upload.
const MAX_SIDE=2000;
const MAX_FILE=60_000_000;
const ascii=(bytes,from,to)=>String.fromCharCode(...bytes.slice(from,to));

// Android galleries often hand over files without a type or extension, so the real format is read from the first bytes.
export async function sniff(file){
  const b=new Uint8Array(await file.slice(0,32).arrayBuffer());
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpeg';
  if(b[0]===0x89&&ascii(b,1,4)==='PNG')return 'png';
  if(ascii(b,0,4)==='GIF8')return 'gif';
  if(ascii(b,0,2)==='BM')return 'bmp';
  if(ascii(b,0,4)==='RIFF'&&ascii(b,8,12)==='WEBP')return 'webp';
  if(ascii(b,4,8)==='ftyp'){
    const brands=ascii(b,8,32);
    if(/avi[fs]/.test(brands))return 'avif';
    if(/hei[cxms]|hev[cxms]|mif1|msf1/.test(brands))return 'heic';
  }
  return '';
}

async function decode(file,format){
  if(format==='heic'){
    try{const {heicTo}=await import('heic-to');return await heicTo({blob:file,type:'bitmap'});}
    catch{throw new Error('Fotografii HEIC se nepodařilo převést. Zkuste ji v telefonu uložit jako JPEG.');}
  }
  // Large phone photos (50+ Mpx) can exhaust mobile memory, so they are shrunk while decoding.
  const options=file.size>6_000_000?{imageOrientation:'from-image',resizeWidth:2400,resizeQuality:'high'}:{imageOrientation:'from-image'};
  try{return await createImageBitmap(file,options);}catch{}
  try{return await createImageBitmap(file);}catch{}
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    return {source:img,width:img.naturalWidth,height:img.naturalHeight,close(){}};
  }catch{
    throw new Error('Tuto fotografii se nepodařilo otevřít. Zkuste ji uložit jako JPEG a nahrát znovu.');
  }finally{URL.revokeObjectURL(url);}
}

export async function photoBlob(file){
  if(file.size>MAX_FILE)throw new Error('Fotografie je větší než 60 MB.');
  const format=await sniff(file);
  if(!format)throw new Error('Soubor není fotografie (podporujeme JPG, PNG, WebP, HEIC, GIF, AVIF a BMP).');
  const bitmap=await decode(file,format);
  const width=bitmap.width,height=bitmap.height;
  if(!width||!height){bitmap.close();throw new Error('Fotografii se nepodařilo přečíst.');}
  const scale=Math.min(1,MAX_SIDE/Math.max(width,height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  canvas.getContext('2d').drawImage(bitmap.source||bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
  canvas.width=canvas.height=0;
  if(!blob||blob.type!=='image/webp')throw new Error('Tento prohlížeč neumí fotografii převést. Aktualizujte Chrome nebo zkuste jiný prohlížeč.');
  if(blob.size>5_000_000)throw new Error('Fotografie je i po zmenšení příliš velká.');
  return blob;
}
