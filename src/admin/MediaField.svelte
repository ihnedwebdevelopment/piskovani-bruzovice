<script>
  export let value='';
  export let label='Fotografie';
  export let video=false;
  export let choices=[];
  export let onChange;
  export let upload;
  let busy=false;
  let error='';
  let input;
  async function choose(event){
    const file=event.target.files?.[0];if(!file)return;
    error='';busy=true;
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30_000_000)throw new Error('Vyberte JPG, PNG nebo WebP do 30 MB.');
      const bitmap=await createImageBitmap(file);
      if(bitmap.width*bitmap.height>80_000_000){bitmap.close();throw new Error('Fotografie má příliš vysoké rozlišení.');}
      const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const data=canvas.toDataURL('image/webp',.86).split(',')[1];
      if(data.length>4_000_000)throw new Error('Fotografie je příliš velká. Zmenšete ji a zkuste to znovu.');
      onChange(await upload(data));
    }catch(e){error=e.message;}finally{busy=false;input.value='';}
  }
</script>
<div class="admin-field media-editor">
  <span class="admin-label">{label}</span>
  {#if value}{#if video}<video src={value} controls muted preload="metadata" aria-label={label}></video>{:else}<img src={value} alt={label} loading="lazy" />{/if}{/if}
  <label class="media-select">Vybrat existující {video?'video':'fotografii'}<select value={choices.includes(value)?value:''} on:change={e=>onChange(e.target.value)}><option value="" disabled>Vyberte soubor…</option>{#each choices as url}<option value={url}>{url.split('/').pop()}</option>{/each}</select></label>
  {#if !video}<input bind:this={input} class="admin-file" type="file" accept="image/jpeg,image/png,image/webp" on:change={choose} disabled={busy} aria-label={`Nahrát: ${label}`} /><button class="admin-button secondary" type="button" on:click={()=>input.click()} disabled={busy}>{busy?'Nahrávám fotografii…':'Nahrát vlastní fotografii'}</button><small>Fotografii automaticky zmenšíme pro rychlé načítání webu.</small>{/if}
  {#if video}<small>Vyberte jedno z dodaných videí. Vlastní soubor MP4/WebM lze přidat do public/media a znovu nasadit web.</small><input type="text" value={value} on:input={e=>onChange(e.target.value)} placeholder="/media/video.mp4" aria-label="Cesta k videu" />{/if}
  {#if error}<p class="admin-error" role="alert">{error}</p>{/if}
</div>
