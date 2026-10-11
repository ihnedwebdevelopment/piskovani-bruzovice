<script>
  import { photoBlob } from './photo.js';
  export let upload;
  export let onAdd;
  export let room=80;
  let input,busy=false,status='',errors=[];
  // One photo at a time keeps memory low on phones; each finished photo is added right away.
  async function choose(event){
    const files=[...(event.target.files||[])].slice(0,room);
    input.value='';if(!files.length)return;
    busy=true;errors=[];let done=0;
    for(const [index,file] of files.entries()){
      status=`Nahrávám ${index+1} z ${files.length}…`;
      try{onAdd(await upload(await photoBlob(file),'webp',p=>status=`Nahrávám ${index+1} z ${files.length}… ${Math.round(p)} %`));done++;}
      catch(e){errors=[...errors,`${file.name||`Fotografie ${index+1}`}: ${e.message}`];}
    }
    busy=false;
    status=done?`Přidáno ${done} ${done===1?'fotografie':'fotografií'}. Nezapomeňte kliknout na Uložit změny.`:'';
  }
</script>
<div class="admin-bulk">
  <input bind:this={input} class="admin-file" type="file" accept="image/*" multiple on:change={choose} disabled={busy} aria-label="Nahrát více fotografií" />
  <button class="admin-button primary" type="button" on:click={()=>input.click()} disabled={busy||room<=0}>{busy?'Nahrávám…':'+ Nahrát více fotografií najednou'}</button>
  {#if status}<p class="admin-bulk-status" aria-live="polite">{status}</p>{/if}
  {#if errors.length}<div class="admin-error" role="alert"><strong>Některé fotografie se nenahrály:</strong>{#each errors as message}<div>{message}</div>{/each}</div>{/if}
</div>
