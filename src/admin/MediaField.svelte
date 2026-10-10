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
  async function photoBlob(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>40_000_000)throw new Error('Vyberte JPG, PNG nebo WebP do 40 MB.');
    const bitmap=await createImageBitmap(file);
    if(bitmap.width*bitmap.height>80_000_000){bitmap.close();throw new Error('Fotografie má příliš vysoké rozlišení.');}
    const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
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
        const type=file.type||(file.name.toLowerCase().endsWith('.webm')?'video/webm':'video/mp4');
        if(!['video/mp4','video/webm'].includes(type))throw new Error('Vyberte video MP4 nebo WebM.');
        if(file.size>300_000_000)throw new Error('Video smí mít nejvýše 300 MB. Zkraťte ho nebo zmenšete rozlišení.');
        onChange(await upload(file,type==='video/webm'?'webm':'mp4',p=>progress=p));
      }else onChange(await upload(await photoBlob(file),'webp',p=>progress=p));
    }catch(e){error=e.message;}finally{busy=false;input.value='';}
  }
</script>
<div class="admin-field media-editor">
  <span class="admin-label">{label}</span>
  {#if value}{#if video}<video src={value} controls muted preload="metadata" aria-label={label}></video>{:else}<img src={value} alt={label} loading="lazy" />{/if}{/if}
  <label class="media-select">Vybrat existující {video?'video':'fotografii'}<select value={choices.includes(value)?value:''} on:change={e=>onChange(e.target.value)}><option value="" disabled>Vyberte soubor…</option>{#each choices as url}<option value={url}>{url.split('/').pop()}</option>{/each}</select></label>
  <input bind:this={input} class="admin-file" type="file" accept={video?'video/mp4,video/webm':'image/jpeg,image/png,image/webp'} on:change={choose} disabled={busy} aria-label={`Nahrát: ${label}`} />
  <button class="admin-button secondary" type="button" on:click={()=>input.click()} disabled={busy}>{busy?`Nahrávám… ${Math.round(progress)} %`:video?'Nahrát vlastní video':'Nahrát vlastní fotografii'}</button>
  <small>{video?'MP4 nebo WebM do 300 MB. Nahrání delšího videa může chvíli trvat.':'Fotografii automaticky zmenšíme pro rychlé načítání webu.'}</small>
  {#if error}<p class="admin-error" role="alert">{error}</p>{/if}
</div>
