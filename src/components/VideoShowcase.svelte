<script>
  import { siteContent } from "../lib/content-store.js";
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  $: clips = $siteContent.clips;
  let selected = 0;
  let started = false;
  let player;
  let error = '';
  async function play(index = selected) {
    player?.pause();
    selected = index;
    started = true;
    error = '';
    await tick();
    player.load();
    try { await player.play(); } catch { /* Native controls remain available if autoplay is blocked. */ }
  }
</script>

<section id="videa" class="video-section section-space" aria-labelledby="videos-title">
  <div class="container-xl">
    <div class="section-top reveal"><div><p class="eyebrow"><span></span> {$siteContent.copy["videa"].text001}</p><h2 id="videos-title">{$siteContent.copy["videa"].text002}<br /><em>{$siteContent.copy["videa"].text003}</em></h2></div><p>{$siteContent.copy["videa"].text004}</p></div>
    <div class="video-layout reveal">
      <div class="video-stage">
        <video bind:this={player} muted controls={started} playsinline preload="none" poster={clips[selected].poster} src={started ? clips[selected].src : undefined} aria-hidden={!started} aria-label={clips[selected].title} on:error={() => error = 'Video se nepodařilo načíst. Zkuste ho otevřít samostatně.'}></video>
        {#if !started}<button class="video-cover" type="button" on:click={() => play()} aria-label={`Přehrát video: ${clips[selected].title}`}><span class="play-circle"><Icon name="play" size={30} /></span><span>{$siteContent.copy["videa"].text005} <small>{clips[selected].time}</small></span></button>{/if}
        <span class="video-label"><span class="live-dot"></span> {$siteContent.copy["videa"].text006}</span>
        {#if error}<p class="video-error" role="alert">{error} <a href={clips[selected].src}>{$siteContent.copy["videa"].text007}</a></p>{/if}
      </div>
      <div class="video-playlist" role="group" aria-label="Výběr videa">
        {#each clips as clip, index}<button class:chosen={selected === index} type="button" on:click={() => play(index)} aria-pressed={selected === index}><span class="clip-image"><img src={clip.poster} alt="" loading="lazy" /><span>{clip.time}</span></span><span class="clip-copy"><small>{clip.tag}</small><strong>{clip.title}</strong></span><Icon name={selected === index && started ? 'check' : 'play'} size={18} /></button>{/each}
      </div>
    </div>
    <div class="video-caption"><p>{clips[selected].text}</p><span>{$siteContent.copy["videa"].text008}</span></div>
  </div>
</section>
