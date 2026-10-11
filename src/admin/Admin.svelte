<script>
  import { onMount } from 'svelte';
  import { upload as blobUpload } from '@vercel/blob/client';
  import { defaults, sections, copySections, validateContent } from '../lib/content-schema.js';
  import ContentFields from './ContentFields.svelte';
  import '../admin/admin.css';
  let username='admin',password='',authenticated=false,loading=true,busy=false,error='',notice='';
  let content=structuredClone(defaults),baseline='',revision=0,active='copy',copyGroup='nahoru',updatedAt='';
  let loginNeeded=false;
  let addedPhotos=[],addedVideos=[];
  $: dirty=baseline && JSON.stringify(content)!==baseline;
  $: photoChoices=[...new Set([...collectMedia(defaults),...collectMedia(content),...addedPhotos])];
  $: videoChoices=[...new Set([...collectMedia(defaults,true),...collectMedia(content,true),...addedVideos])];
  function collectMedia(object,video=false){
    const result=[];function walk(value){if(typeof value==='string'&&(video?/\.(mp4|webm)$/:/\.(webp|png|jpe?g)$/i).test(value)&&(value.startsWith('/media/')||value.startsWith('https://')))result.push(value);else if(value&&typeof value==='object')Object.values(value).forEach(walk);}walk(object);return result;
  }
  async function api(action,body){
    const response=await fetch(action?`/api/admin?action=${action}`:'/api/admin',{method:action?'POST':'GET',credentials:'same-origin',headers:action?{'Content-Type':'application/json'}:{},body:action?JSON.stringify(body||{}):undefined,signal:AbortSignal.timeout(action==='upload'?30000:20000)});
    const data=await response.json();
    if(!response.ok){if(response.status===401&&authenticated)loginNeeded=true;throw Object.assign(new Error(data.message||'Operace se nezdařila.'),{status:response.status});}return data;
  }
  async function load(){loading=true;try{const data=await api();content=data.content;baseline=JSON.stringify(content);revision=data.revision;updatedAt=data.updatedAt||'';authenticated=true;error='';}catch(e){if(e.status!==401)error=e.message;}finally{loading=false;}}
  onMount(load);
  function change(section,value){content={...content,[section]:value};notice='';}
  async function signIn(){busy=true;error='';try{await api('login',{username,password});password='';if(loginNeeded){loginNeeded=false;notice='Jste znovu přihlášeni. Můžete uložit rozpracované změny.';}else await load();}catch(e){error=e.message;}finally{busy=false;}}
  async function signOut(){if(dirty&&!confirm('Máte neuložené změny. Opravdu se odhlásit?'))return;try{await api('logout');authenticated=false;password='';baseline='';content=structuredClone(defaults);error='';}catch(e){error=e.message;}}
  async function save(){
    const checked=validateContent(content);if(!checked.valid){error=checked.errors.slice(0,5).join(' ');return;}
    busy=true;error='';notice='';try{const data=await api('save',{content,revision});revision=data.revision;updatedAt=data.updatedAt;baseline=JSON.stringify(content);notice='Uloženo. Změny se na webu projeví do minuty.';}catch(e){error=e.message;}finally{busy=false;}
  }
  async function upload(file,extension,onProgress,contentType){
    const folder=extension==='webp'?'photos':'videos';
    try{
      const result=await blobUpload(`${folder}/${crypto.randomUUID()}.${extension}`,file,{access:'public',handleUploadUrl:'/api/admin?action=upload',contentType:contentType||file.type||`video/${extension}`,multipart:file.size>20_000_000,onUploadProgress:e=>onProgress?.(e.percentage)});
      if(folder==='photos')addedPhotos=[...addedPhotos,result.url];else addedVideos=[...addedVideos,result.url];
      return result.url;
    }catch{throw new Error('Soubor se nepodařilo nahrát. Zkontrolujte připojení, případně se odhlaste a znovu přihlaste.');}
  }
  function discard(){if(!dirty||confirm('Zahodit neuložené úpravy a načíst poslední uloženou verzi?'))load();}
  function backup(){const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`bruzovice-zaloha-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function restore(event){try{const file=event.target.files?.[0];if(!file)return;if(file.size>400000)throw new Error('Záloha je příliš velká.');const next=JSON.parse(await file.text());const checked=validateContent(next);if(!checked.valid)throw new Error('Tato záloha má neplatný formát.');if(dirty&&!confirm('Nahradit rozpracované změny zálohou?'))return;content=next;notice='Záloha je načtena. Zkontrolujte ji a uložte změny.';error='';}catch(e){error=e.message;}finally{event.target.value='';}}
</script>
<svelte:head><title>Administrace | Pískování Bruzovice</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<svelte:window on:beforeunload={event=>{if(dirty){event.preventDefault();event.returnValue='';}}} />
<div class="admin-shell">
{#if loading&&!authenticated}<div class="admin-login-wrap"><p>Načítání administrace…</p></div>
{:else if !authenticated || loginNeeded}
  <div class="admin-login-wrap"><div class="admin-login-card"><a class="admin-wordmark" href="/">PÍSKOVÁNÍ <strong>BRUZOVICE</strong></a><span class="admin-kicker">SPRÁVA WEBU</span><h1>{loginNeeded?'Přihlaste se znovu.':'Vítejte zpátky.'}</h1><p>{loginNeeded?'Vaše rozpracované úpravy zůstaly zachované.':'Texty, fotografie a realizace. Všechno na jednom místě.'}</p><form on:submit|preventDefault={signIn}><label class="admin-field">Přihlašovací jméno<input bind:value={username} autocomplete="username" required /></label><label class="admin-field">Heslo<input type="password" bind:value={password} autocomplete="current-password" required /></label>{#if error}<p class="admin-error" role="alert">{error}</p>{/if}<button class="admin-button primary" disabled={busy}>{busy?'Přihlašuji…':'Přihlásit se'} <span>↗</span></button></form><a class="admin-back" href="/">← Zpět na web</a></div><p class="admin-login-note">Administrace Pískování Bruzovice</p></div>
{:else}
  <aside class="admin-sidebar"><a class="admin-wordmark" href="/" target="_blank" rel="noopener">PÍSKOVÁNÍ <strong>BRUZOVICE</strong></a><p class="admin-kicker">OBSAH VAŠEHO WEBU</p><nav aria-label="Sekce administrace"><button class:active={active==='copy'} on:click={()=>active='copy'}>Texty webu <span>↗</span></button>{#each Object.entries(sections) as [key,title]}<button class:active={active===key} on:click={()=>active=key}>{title}<span>↗</span></button>{/each}</nav><div class="admin-sidebar-bottom"><a href="/" target="_blank" rel="noopener">Otevřít web ↗</a><button type="button" on:click={signOut}>Odhlásit se</button></div></aside>
  <main class="admin-main"><header class="admin-toolbar"><div><p class="admin-kicker">ADMINISTRACE</p><h1>{active==='copy'?'Texty webu':sections[active]}</h1></div><div class="admin-save-actions"><span class:unsaved={dirty}>{busy?'Ukládání…':dirty?'Neuložené změny':'Vše je uložené'}</span><button class="admin-button primary" disabled={!dirty||busy} on:click={save}>{busy?'Ukládám…':'Uložit změny'} <span>↗</span></button></div></header>
  <div class="admin-content"><div aria-live="polite">{#if notice}<p class="admin-notice">✓ {notice}</p>{/if}{#if error}<p class="admin-error" role="alert">{error}</p>{/if}</div>
  <p class="admin-help">{active==='projects'?'Přidejte realizaci, upravte její popis a vyberte fotografie. Pořadí změníte šipkami.':active==='assets'?'Vyberte hlavní fotografie webu nebo nahrajte vlastní.':active==='copy'?'Vyberte část stránky a upravte její texty. Formátování a rozložení webu zůstane zachované.':'Úpravy zveřejníte tlačítkem Uložit změny.'}</p>
  <fieldset disabled={busy} class="admin-editor">
    {#if active==='copy'}<label class="admin-section-picker">Část stránky<select bind:value={copyGroup}>{#each Object.keys(content.copy) as group}<option value={group}>{copySections[group]||group}</option>{/each}</select></label><ContentFields value={content.copy[copyGroup]} path={['copy',copyGroup]} template={defaults.copy[copyGroup]} onChange={next=>change('copy',{...content.copy,[copyGroup]:next})} {upload} photos={photoChoices} videos={videoChoices} />
    {:else}<ContentFields value={content[active]} path={[active]} template={defaults[active]} onChange={next=>change(active,next)} {upload} photos={photoChoices} videos={videoChoices} />{/if}
  </fieldset>
  <footer class="admin-bottom"><span>{updatedAt?`Poslední uložení: ${new Date(updatedAt).toLocaleString('cs-CZ')}`:'Výchozí obsah webu'}</span><div><button on:click={backup}>Stáhnout zálohu</button><label class="admin-import">Načíst zálohu<input type="file" accept="application/json,.json" on:change={restore} /></label><button on:click={discard} disabled={busy}>Načíst uloženou verzi</button></div></footer>
  </div></main>
{/if}
</div>
