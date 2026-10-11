<script>
  import { photoBlob } from './photo.js';
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
  const extensionOf=file=>file.name.split('.').pop().toLowerCase();
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
  <input bind:this={input} class="admin-file" type="file" accept={video?'video/mp4,video/webm,video/quicktime,.mov,.m4v':'image/*'} on:change={choose} disabled={busy} aria-label={`Nahrát: ${label}`} />
  <button class="admin-button secondary" type="button" on:click={()=>input.click()} disabled={busy}>{busy?`Nahrávám… ${Math.round(progress)} %`:video?'Nahrát vlastní video':'Nahrát vlastní fotografii'}</button>
  <small>{video?'MP4, MOV (z iPhonu) nebo WebM do 300 MB. Nejlépe kódování H.264. Videa v HEVC (H.265) se nemusí přehrát v Chrome a Firefoxu. Nahrání může chvíli trvat.':'JPG, PNG, WebP, HEIC (iPhone), GIF, AVIF nebo BMP. Fotografii automaticky zmenšíme a převedeme pro rychlé načítání webu.'}</small>
  {#if error}<p class="admin-error" role="alert">{error}</p>{/if}
</div>
