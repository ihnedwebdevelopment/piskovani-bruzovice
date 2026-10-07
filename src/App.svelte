<script>
  import { siteContent } from "./lib/content-store.js";
  import { onMount, tick } from 'svelte';
  import Icon from './components/Icon.svelte';
  import VideoShowcase from './components/VideoShowcase.svelte';
  import InquiryForm from './components/InquiryForm.svelte';
  $: services = $siteContent.services;
  $: projects = $siteContent.projects;

  let activeFilter = 'Vše';
  let selectedProject = null;
  let dialog;
  let menuOpen = false;
  let scrolled = false;
  let heroImage;
  let statementImage;
  let heroVideo;
  let useHeroVideo = false;
  let videoPaused = false;
  let contactVisible = false;
  let progress = 0;
  let lastProjectTrigger;
  $: faqs = $siteContent.faqs;
  $: visibleProjects = activeFilter === 'Vše' ? projects : projects.filter(project => project.category === activeFilter);
  async function openProject(project, event) {
    lastProjectTrigger = event.currentTarget;
    selectedProject = project;
    await tick();
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  function onDialogClose() {
    selectedProject = null;
    document.body.classList.remove('dialog-open');
    lastProjectTrigger?.focus();
  }
  async function toggleHeroVideo() {
    if (!heroVideo) return;
    if (heroVideo.paused) { try { await heroVideo.play(); videoPaused = false; } catch { videoPaused = true; } }
    else { heroVideo.pause(); videoPaused = true; }
  }
  function closeMenu() { menuOpen = false; }
  $: if (typeof document !== 'undefined') document.body.classList.toggle('menu-is-open', menuOpen);
  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 992px)');
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(node => revealObserver.observe(node));
    const applyMotion = () => {
      document.body.classList.toggle('motion-ready', !reduced.matches);
      useHeroVideo = desktop.matches && !reduced.matches && !navigator.connection?.saveData;
    };
    applyMotion();
    reduced.addEventListener('change', applyMotion);
    desktop.addEventListener('change', applyMotion);
    let raf;
    const update = () => {
      scrolled = window.scrollY > 40;
      progress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (!reduced.matches) {
        if (heroImage) heroImage.style.transform = `translate3d(0, ${Math.min(window.scrollY * (desktop.matches ? 0.2 : 0.08), 180)}px, 0)`;
        if (statementImage) {
          const top = statementImage.parentElement.getBoundingClientRect().top;
          statementImage.style.transform = `translate3d(0, ${Math.max(-60, Math.min(60, -top * 0.1))}px, 0)`;
        }
      }
      raf = null;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const contactObserver = new IntersectionObserver(([entry]) => contactVisible = entry.isIntersecting, { threshold: 0 });
    contactObserver.observe(document.getElementById('kontakt'));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
      reduced.removeEventListener('change', applyMotion); desktop.removeEventListener('change', applyMotion);
      revealObserver.disconnect(); contactObserver.disconnect(); cancelAnimationFrame(raf);
      document.body.classList.remove('motion-ready', 'dialog-open', 'menu-is-open');
    };
  });
</script>

<svelte:head><title>{$siteContent.settings.siteTitle}</title><meta name="description" content={$siteContent.settings.description} /></svelte:head>

<svelte:window on:keydown={(event) => { if (event.key === 'Escape') closeMenu(); }} />

<a class="skip-link" href="#obsah">{$siteContent.copy["general"].text001}</a>
<div class="site-shell">
  <header class="site-header" class:scrolled class:menu-open={menuOpen}>
    <div class="container-xl header-inner">
      <a class="brand" href="#nahoru" aria-label="Pískování Bruzovice — úvod" on:click={closeMenu}><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>{$siteContent.copy["site-header"].text002}<strong>{$siteContent.copy["site-header"].text003}</strong></span></a>
      <button class="menu-toggle" class:opened={menuOpen} type="button" aria-label={menuOpen ? 'Zavřít menu' : 'Otevřít menu'} aria-expanded={menuOpen} aria-controls="main-nav" on:click={() => menuOpen = !menuOpen}><span></span><span></span></button>
      <nav id="main-nav" class:open={menuOpen} aria-label="Hlavní navigace"><a href="#sluzby" on:click={closeMenu}>{$siteContent.copy["site-header"].text004}</a><a href="#realizace" on:click={closeMenu}>{$siteContent.copy["site-header"].text005}</a><a href="#videa" on:click={closeMenu}>{$siteContent.copy["site-header"].text006}</a><a href="#postup" on:click={closeMenu}>{$siteContent.copy["site-header"].text007}</a><a class="nav-cta" href="#kontakt" on:click={closeMenu}>{$siteContent.copy["site-header"].text008} <Icon size={17} /></a></nav>
    </div>
    <div class="scroll-progress" style:transform={`scaleX(${progress})`}></div>
  </header>
  <main id="obsah">
    <section id="nahoru" class="hero" aria-labelledby="hero-title">
      <div class="hero-image" style:background-image={`url("${$siteContent.assets.hero}")`} bind:this={heroImage}>{#if useHeroVideo}<video class="hero-video" bind:this={heroVideo} src={$siteContent.assets.heroVideo} autoplay muted loop playsinline preload="none" on:pause={() => videoPaused = true} on:play={() => videoPaused = false} aria-hidden="true" tabindex="-1"></video>{/if}</div><div class="hero-shade"></div><div class="hero-grain"></div>
      <div class="container-xl hero-content"><div class="hero-copy"><p class="eyebrow light hero-enter"><span></span> {$siteContent.copy["nahoru"].text009}</p><h1 id="hero-title" class="hero-enter">{$siteContent.copy["nahoru"].text010}<br />{$siteContent.copy["nahoru"].text011} <em>{$siteContent.copy["nahoru"].text012}</em></h1><p class="hero-lead hero-enter">{$siteContent.copy["nahoru"].text013}</p><div class="hero-actions hero-enter"><a class="button button-accent" href="#kontakt">{$siteContent.copy["nahoru"].text014} <Icon /></a><a class="hero-watch" href="#videa"><span><Icon name="play" size={17} /></span> {$siteContent.copy["nahoru"].text015}</a></div></div></div>
      <div class="hero-base container-xl"><div class="hero-location"><Icon name="pin" size={19} /><span>{$siteContent.copy["nahoru"].text016}<br /><strong>{$siteContent.copy["nahoru"].text017}</strong></span></div><a class="hero-project" href="#realizace"><img src="/media/skoda-110r-06.webp" alt="" /><span><small>{$siteContent.copy["nahoru"].text018}</small><strong>{$siteContent.copy["nahoru"].text019}</strong></span><Icon /></a>{#if useHeroVideo}<button class="motion-control" type="button" on:click={toggleHeroVideo} aria-label={videoPaused ? 'Přehrát video na pozadí' : 'Pozastavit video na pozadí'}><Icon name={videoPaused ? 'play' : 'pause'} size={17} /></button>{/if}</div>
    </section>
    <div class="service-ribbon" aria-label="Zaměření služeb"><div class="container-xl"><span><Icon name="spark" size={15} /> {$siteContent.copy["general"].text020}</span><span><Icon name="spark" size={15} /> {$siteContent.copy["general"].text021}</span><span><Icon name="spark" size={15} /> {$siteContent.copy["general"].text022}</span><span><Icon name="spark" size={15} /> {$siteContent.copy["general"].text023}</span></div></div>

    <section class="intro section-space"><div class="container-xl"><div class="row align-items-center g-5"><div class="col-lg-6 reveal"><div class="intro-photo"><img src={$siteContent.assets.intro} alt={$siteContent.assets.introAlt} loading="lazy" width="1080" height="1080" /><span class="image-caption">{$siteContent.copy["intro"].text024}</span><div class="intro-badge"><Icon name="spark" size={34} /><span>{$siteContent.copy["intro"].text025}<br /><strong>{$siteContent.copy["intro"].text026}</strong></span></div></div></div><div class="col-lg-5 offset-lg-1 reveal"><p class="eyebrow"><span></span> {$siteContent.copy["intro"].text027}</p><h2>{$siteContent.copy["intro"].text028}<br /><em>{$siteContent.copy["intro"].text029}</em></h2><p class="section-lead">{$siteContent.copy["intro"].text030}</p><p class="body-copy">{$siteContent.copy["intro"].text031}</p><ul class="check-list"><li><Icon name="check" /> {$siteContent.copy["intro"].text032}</li><li><Icon name="check" /> {$siteContent.copy["intro"].text033}</li><li><Icon name="check" /> {$siteContent.copy["intro"].text034}</li></ul><a class="text-link" href="#sluzby">{$siteContent.copy["intro"].text035} <Icon /></a></div></div></div></section>

    <section id="sluzby" class="services section-space"><div class="container-xl"><div class="section-top reveal"><div><p class="eyebrow"><span></span> {$siteContent.copy["sluzby"].text036}</p><h2>{$siteContent.copy["sluzby"].text037}<br /><em>{$siteContent.copy["sluzby"].text038}</em></h2></div><p>{$siteContent.copy["sluzby"].text039}</p></div><div class="row g-3 service-grid reveal">{#each services as service}<div class="col-md-4"><article class="service-card"><div class="service-top"><Icon name={service.icon} size={56} /></div><h3>{service.title}</h3><p>{service.text}</p><small>{service.detail}</small><a href="#kontakt" aria-label={`Poptat službu ${service.title}`}>{$siteContent.copy["sluzby"].text040} <Icon /></a></article></div>{/each}</div></div></section>

    <section id="realizace" class="projects section-space"><div class="container-xl"><div class="section-top reveal"><div><p class="eyebrow"><span></span> {$siteContent.copy["realizace"].text041}</p><h2>{$siteContent.copy["realizace"].text042}<br /><em>{$siteContent.copy["realizace"].text043}</em></h2></div><div class="projects-description"><p>{$siteContent.copy["realizace"].text044}</p><span class="tiny-label">{$siteContent.copy["realizace"].text045}</span></div></div><div class="filter-bar reveal" role="group" aria-label="Filtrovat realizace">{#each ['Vše', ...new Set(projects.map(p => p.category))] as filter}<button type="button" class:active={activeFilter === filter} aria-pressed={activeFilter === filter} on:click={() => activeFilter = filter}>{filter}</button>{/each}</div><p class="visually-hidden" aria-live="polite">{$siteContent.copy["realizace"].text046} {visibleProjects.length}</p><div class="project-grid reveal">{#each visibleProjects as project (project.id)}<button class="project-card" type="button" on:click={(event) => openProject(project, event)} aria-label={`Prohlédnout realizaci ${project.title}`}><div class="project-image"><img src={project.cover} alt={project.alt} loading="lazy" /><span class="project-tag">{project.category}</span><span class="project-open"><Icon /></span></div><div class="project-meta"><span><small>{project.kicker}</small><strong>{project.title}</strong></span></div></button>{/each}</div></div></section>

    <VideoShowcase />

    <section class="statement"><div class="statement-image" style:background-image={`url("${$siteContent.assets.statement}")`} bind:this={statementImage}></div><div class="statement-shade"></div><div class="container-xl statement-content reveal"><p class="eyebrow light"><span></span> {$siteContent.copy["statement"].text047}</p><p>{$siteContent.copy["statement"].text048}<br />{$siteContent.copy["statement"].text049} <em>{$siteContent.copy["statement"].text050}</em></p><a class="button button-outline" href="#kontakt">{$siteContent.copy["statement"].text051} <Icon /></a></div></section>

    <section id="postup" class="process section-space"><div class="container-xl"><div class="section-top reveal"><div><p class="eyebrow"><span></span> {$siteContent.copy["postup"].text052}</p><h2>{$siteContent.copy["postup"].text053}<br /><em>{$siteContent.copy["postup"].text054}</em></h2></div><p>{$siteContent.copy["postup"].text055}</p></div><div class="process-steps reveal"><article><div class="step-line"></div><h3>{$siteContent.copy["postup"].text056}</h3><p>{$siteContent.copy["postup"].text057}</p></article><article><div class="step-line"></div><h3>{$siteContent.copy["postup"].text058}</h3><p>{$siteContent.copy["postup"].text059}</p></article><article><div class="step-line"></div><h3>{$siteContent.copy["postup"].text060}</h3><p>{$siteContent.copy["postup"].text061}</p></article></div></div></section>

    <section class="faq-section section-space"><div class="container-xl"><div class="row g-5"><div class="col-lg-5 reveal"><p class="eyebrow"><span></span> {$siteContent.copy["faq-section"].text062}</p><h2>{$siteContent.copy["faq-section"].text063}<br /><em>{$siteContent.copy["faq-section"].text064}</em></h2><p class="body-copy">{$siteContent.copy["faq-section"].text065}<br /><a href={`mailto:${$siteContent.settings.email}`}>{$siteContent.copy["faq-section"].text066} <Icon name="arrow" size={16} /></a></p></div><div class="col-lg-7 faq-list reveal">{#each faqs as faq}<details><summary>{faq[0]}<Icon name="plus" size={20} /></summary><p>{faq[1]}</p></details>{/each}</div></div></div></section>

    <section id="kontakt" class="contact section-space"><div class="container-xl"><div class="row g-5"><div class="col-lg-5 contact-copy reveal"><p class="eyebrow light"><span></span> {$siteContent.copy["kontakt"].text067}</p><h2>{$siteContent.copy["kontakt"].text068}<br /><em>{$siteContent.copy["kontakt"].text069}</em></h2><p>{$siteContent.copy["kontakt"].text070}</p><a class="contact-email" href={`mailto:${$siteContent.settings.email}`}><span class="contact-icon"><Icon name="mail" /></span><span><small>{$siteContent.copy["kontakt"].text071}</small><strong>{$siteContent.settings.email}</strong></span><Icon size={18} /></a><div class="contact-place"><Icon name="pin" /><span>{$siteContent.copy["kontakt"].text072}<small>{$siteContent.copy["kontakt"].text073}</small></span></div><div class="contact-tip"><Icon name="spark" size={26} /><p>{$siteContent.copy["kontakt"].text074}<br /><strong>{$siteContent.copy["kontakt"].text075}</strong></p></div></div><div class="col-lg-7"><InquiryForm /></div></div></div></section>
  </main>
  <footer class="footer"><div class="container-xl"><div class="footer-top"><a class="brand" href="#nahoru" aria-label="Pískování Bruzovice — zpět nahoru"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>{$siteContent.copy["footer"].text076}<strong>{$siteContent.copy["footer"].text077}</strong></span></a><p>{$siteContent.copy["footer"].text078}<br /><strong>{$siteContent.copy["footer"].text079}</strong></p><a class="back-top" href="#nahoru" aria-label="Zpět nahoru"><Icon name="down" /></a></div><div class="footer-bottom"><span>© {new Date().getFullYear()} {$siteContent.copy["footer"].text080}</span><a href={`mailto:${$siteContent.settings.email}`}>{$siteContent.settings.email}</a><span>{$siteContent.copy["footer"].text081}</span></div></div></footer>
  <div class="mobile-contact" class:hidden={contactVisible || menuOpen}><a href={`mailto:${$siteContent.settings.email}`} aria-label="Napsat e-mail"><Icon name="mail" /></a><a href="#kontakt">{$siteContent.copy["general"].text082} <Icon /></a></div>
</div>
<dialog class="project-dialog" bind:this={dialog} aria-label={selectedProject ? `Realizace ${selectedProject.title}` : 'Detail realizace'} on:click={(event) => { if (event.target === dialog) dialog.close(); }} on:close={onDialogClose}>
  {#if selectedProject}<div class="dialog-inner"><button class="dialog-close" type="button" on:click={() => dialog.close()} aria-label="Zavřít realizaci"><Icon name="close" /></button><div class="dialog-heading"><p class="eyebrow"><span></span> {selectedProject.kicker}</p><h2>{selectedProject.title}</h2><p>{selectedProject.description}</p></div><div class="dialog-gallery">{#each selectedProject.images as image, index}<img src={image} alt={`${selectedProject.title} — fotografie ${index + 1}`} loading={index > 1 ? 'lazy' : 'eager'} />{/each}</div>{#if selectedProject.video}<div class="dialog-video"><h3>{$siteContent.copy["project-dialog"].text083}</h3><video muted controls playsinline preload="none" poster={selectedProject.cover} aria-label={`Video ${selectedProject.title}`}><source src={selectedProject.video} type="video/mp4" />{$siteContent.copy["project-dialog"].text084}</video></div>{/if}</div>{/if}
</dialog>
