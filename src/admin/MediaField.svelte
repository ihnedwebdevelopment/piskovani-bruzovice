<script>
  export let value='';
  export let label='Fotografie';
  export let video=false;
  export let choices=[];
  export let onChange;
  export let upload;
  let busy=false;
  let progress=0;
  let error='';
  let input;
  const imageTypes=['image/jpeg','image/png','image/webp','image/gif','image/avif','image/bmp','image/heic','image/heif'];
  const imageExtensions={jpg:'image/jpeg',jpeg:'image/jpeg',jfif:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',bmp:'image/bmp',heic:'image/heic',heif:'image/heif'};
  const extensionOf=file=>file.name.split('.').pop().toLowerCase();
  const typeOf=file=>imageTypes.includes(file.type)?file.type:imageExtensions[extensionOf(file)]||'';
  // HEIC (iPhone) is converted in the browser; the converter is only downloaded when such a photo is chosen.
  async function decode(file){
    if(typeOf(file).startsWith('image/hei')){
      try{const {heicTo}=await import('heic-to');return await heicTo({blob:file,type:'bitmap'});}
      catch{throw new Error('Fotografii HEIC se nepodařilo převést. Zkuste ji na telefonu uložit jako JPEG.');}
    }
    try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{}
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();img.src=url;await img.decode();
      return {source:img,width:img.naturalWidth,height:img.naturalHeight,close(){}};
    }catch{
      throw new Error('Tuto fotografii se nepodařilo otevřít. Zkuste ji uložit jako JPEG nebo PNG a nahrát znovu.');
    }finally{URL.revokeObjectURL(url);}
  }
  async function photoBlob(file){
    if(!imageTypes.includes(typeOf(file))||file.size>40_000_000)throw new Error('Vyberte fotografii JPG, PNG, WebP, HEIC, GIF, AVIF nebo BMP do 40 MB.');
    const bitmap=await decode(file);
    const width=bitmap.width,height=bitmap.height;
    if(!width||!height||width*height>80_000_000){bitmap.close();throw new Error('Fotografie má neplatné nebo příliš vysoké rozlišení.');}
    const scale=Math.min(1,2000/Math.max(width,height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    canvas.getContext('2d').drawImage(bitmap.source||bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
    if(!blob||blob.type!=='image/webp')throw new Error('Tento prohlížeč fotografii nedokázal převést. Zkuste jiný prohlížeč.');
    if(blob.size>5_000_000)throw new Error('Fotografie je příliš velká. Zmenšete ji a zkuste to znovu.');
    return blob;
  }
  async function choose(event){
    const file=event.target.files?.[0];if(!file)return;
    error='';busy=true;progress=0;
    try{
      if(video){
        // iPhone .mov files are H.264 in a QuickTime container, which browsers play as MP4.
        const ext=extensionOf(file);
        const kind=file.type==='video/webm'||ext==='webm'?'webm':['video/mp4','video/quicktime','video/x-m4v'].includes(file.type)||['mp4','mov','m4v'].includes(ext)?'mp4':'';
        if(!kind)throw new Error('Vyberte video MP4, MOV, M4V nebo WebM.');
        if(file.size>300_000_000)throw new Error('Video smí mít nejvýše 300 MB. Zkraťte ho nebo zmenšete rozlišení.');
        onChange(await upload(file,kind,p=>progress=p,`video/${kind}`));
      }else onChange(await upload(await photoBlob(file),'webp',p=>progress=p));
    }catch(e){error=e.message;}finally{busy=false;input.value='';}
  }
</script>
<div class="admin-field media-editor">
  <span class="admin-label">{label}</span>
  {#if value}{#if video}<video src={value} controls muted preload="metadata" aria-label={label}></video>{:else}<img src={value} alt={label} loading="lazy" />{/if}{/if}
  <label class="media-select">Vybrat existující {video?'video':'fotografii'}<select value={choices.includes(value)?value:''} on:change={e=>onChange(e.target.value)}><option value="" disabled>Vyberte soubor…</option>{#each choices as url}<option value={url}>{url.split('/').pop()}</option>{/each}</select></label>
  <input bind:this={input} class="admin-file" type="file" accept={video?'video/mp4,video/webm,video/quicktime,.mov,.m4v':'image/*,.heic,.heif'} on:change={choose} disabled={busy} aria-label={`Nahrát: ${label}`} />
  <button class="admin-button secondary" type="button" on:click={()=>input.click()} disabled={busy}>{busy?`Nahrávám… ${Math.round(progress)} %`:video?'Nahrát vlastní video':'Nahrát vlastní fotografii'}</button>
  <small>{video?'MP4, MOV (z iPhonu) nebo WebM do 300 MB. Nejlépe kódování H.264. Videa v HEVC (H.265) se nemusí přehrát v Chrome a Firefoxu. Nahrání může chvíli trvat.':'JPG, PNG, WebP, HEIC (iPhone), GIF, AVIF nebo BMP. Fotografii automaticky zmenšíme a převedeme pro rychlé načítání webu.'}</small>
  {#if error}<p class="admin-error" role="alert">{error}</p>{/if}
</div>
