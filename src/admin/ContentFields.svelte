<script>
  import MediaField from './MediaField.svelte';
  import { labels, isMediaField } from '../lib/content-schema.js';
  export let value;
  export let path=[];
  export let onChange;
  export let upload;
  export let photos=[];
  export let videos=[];
  export let template;
  const titleFor=(key)=>labels[key]||key;
  function change(key,next){const updated=Array.isArray(value)?[...value]:{...value};updated[key]=next;onChange(updated);}
  function remove(index){onChange(value.filter((_,i)=>i!==index));}
  function move(index,delta){const next=[...value];[next[index],next[index+delta]]=[next[index+delta],next[index]];onChange(next);}
  function add(){
    const group=path[0];const next=structuredClone(template?.[0]??value[0]??'');
    if(group==='projects'&&path.length===1){next.id=`realizace-${crypto.randomUUID().slice(0,8)}`;next.title='Nová realizace';next.description='Popište tuto realizaci.';next.images=[next.cover];}
    else if(group==='faqs'){next[0]='Nová otázka';next[1]='Napište odpověď.';}
    onChange([...value,next]);
  }
</script>
{#if Array.isArray(value)}
  {#each value as item,index}
    <section class="admin-repeat">
      <div class="admin-repeat-heading"><strong>{item?.title || (path[0]==='faqs'?item[0]:path.at(-1)==='images'?'Fotografie':'Položka')}</strong><div><button type="button" class="admin-icon-button" disabled={index===0} on:click={()=>move(index,-1)} aria-label="Posunout nahoru">↑</button><button type="button" class="admin-icon-button" disabled={index===value.length-1} on:click={()=>move(index,1)} aria-label="Posunout dolů">↓</button><button type="button" class="admin-icon-button danger" disabled={value.length===1&&['services','clips'].includes(path[0])&&path.length===1} on:click={()=>remove(index)} aria-label="Odebrat položku">×</button></div></div>
      {#if path.at(-1)==='images'}<MediaField value={item} label="Fotografie galerie" choices={photos} {upload} onChange={next=>change(index,next)} />
      {:else if path[0]==='faqs'}<label class="admin-field">Otázka<input value={item[0]} on:input={e=>change(index,[e.target.value,item[1]])} /></label><label class="admin-field">Odpověď<textarea rows="4" value={item[1]} on:input={e=>change(index,[item[0],e.target.value])}></textarea></label>
      {:else}<svelte:self value={item} path={[...path,index]} template={template?.[0]} {photos} {videos} {upload} onChange={next=>change(index,next)} />{/if}
    </section>
  {/each}
  <button class="admin-button secondary" type="button" on:click={add} disabled={value.length>=80}>+ {path.at(-1)==='images'?'Přidat fotografii':path[0]==='projects'?'Přidat realizaci':path[0]==='faqs'?'Přidat otázku':'Přidat položku'}</button>
{:else if value && typeof value==='object'}
  <div class="admin-fields">
  {#each Object.entries(value) as [key,item]}
    {#if key!=='id'}
      {#if isMediaField(key) && typeof item==='string'}<MediaField value={item} label={titleFor(key)} video={['video','src','heroVideo'].includes(key)} choices={['video','src','heroVideo'].includes(key)?videos:photos} {upload} onChange={next=>change(key,next)} />
      {:else if Array.isArray(item)}<div class="admin-subgroup"><h3>{titleFor(key)}</h3><svelte:self value={item} path={[...path,key]} template={template?.[key]} {photos} {videos} {upload} onChange={next=>change(key,next)} /></div>
      {:else if key==='icon'}<label class="admin-field">Ikona<select value={item} on:change={e=>change(key,e.target.value)}><option value="car">Automobil</option><option value="frame">Rám</option><option value="beam">Konstrukce</option><option value="spark">Jiskra</option><option value="shield">Štít</option></select></label>
      {:else}<label class="admin-field"><span>{path[0]==='copy'?(template?.[key]||item).slice(0,90):titleFor(key)}</span>{#if ['text','description','detail'].includes(key)||path[0]==='copy'}<textarea rows={item.length>120?4:2} maxlength="6000" value={item} on:input={e=>change(key,e.target.value)}></textarea>{:else}<input type={key==='email'?'email':'text'} maxlength="6000" value={item} on:input={e=>change(key,e.target.value)} />{/if}</label>{/if}
    {/if}
  {/each}
  </div>
{/if}
