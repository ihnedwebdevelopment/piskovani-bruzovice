import defaults from './content-defaults.json' with { type: 'json' };
export { defaults };
export const sections = { settings: 'Nastavení a kontakt', assets: 'Úvodní fotografie', services: 'Služby', projects: 'Realizace a galerie', clips: 'Videa', faqs: 'Časté otázky' };
export const copySections = { general: 'Odkazy', 'site-header': 'Navigace a logo', nahoru: 'Úvod stránky', intro: 'O nás', sluzby: 'Nadpisy služeb', realizace: 'Nadpisy realizací', statement: 'Fotografický předěl', postup: 'Postup spolupráce', 'faq-section': 'Úvod otázek', kontakt: 'Kontakt', footer: 'Patička', 'project-dialog': 'Detail realizace', videos: 'Videa', videa: 'Videa', form: 'Poptávkový formulář' };
export const labels = { email: 'Kontaktní e-mail', siteTitle: 'Název stránky', description: 'Popis', hero: 'Fotografie v úvodu', heroVideo: 'Video v úvodu', intro: 'Fotografie v sekci O nás', introAlt: 'Popis fotografie pro čtečky', statement: 'Fotografie v předělu', title: 'Název', text: 'Text', icon: 'Ikona', detail: 'Doplňkový text', id: 'Identifikátor', category: 'Kategorie', kicker: 'Podtitulek', cover: 'Úvodní fotografie', alt: 'Popis fotografie', images: 'Fotografie galerie', video: 'Video', tag: 'Kategorie videa', time: 'Délka videa', src: 'Soubor videa', poster: 'Náhledová fotografie' };
export const isMediaField = key => ['hero','intro','statement','cover','poster','src','video','heroVideo','images'].includes(key);
export function safeMedia(value, video = false) {
  if (typeof value !== 'string') return false;
  if (!value && video) return true;
  const uploaded = value.match(/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/(photos|videos)\/[a-f0-9-]{36}\.(webp|mp4|webm)$/);
  if (uploaded) return video ? uploaded[1] === 'videos' : uploaded[1] === 'photos';
  const extension = video ? '(?:mp4|webm)' : '(?:webp|png|jpe?g)';
  return new RegExp(`^/media/[a-zA-Z0-9_/-]+\\.${extension}$`, 'i').test(value) && !value.includes('..');
}
export function validateContent(value) {
  const errors=[];
  function walk(data, template, path) {
    if (typeof template === 'string') {
      if (typeof data !== 'string' || data.length > 6000) { errors.push(`${path}: očekáván text do 6 000 znaků.`); return; }
      const key=path.split('.').at(-1);
      if (isMediaField(key) || /\.images\.\d+$/.test(path)) {
        const video=['src','video','heroVideo'].includes(key);
        if(!safeMedia(data,video)) errors.push(`${path}: vyberte platný soubor ze složky media.`);
      }
      return;
    }
    if (Array.isArray(template)) {
      if(!Array.isArray(data)||data.length>80||(!data.length && ['services','clips'].includes(path))){ errors.push(`${path}: neplatný seznam.`);return; }
      data.forEach((item,index)=>walk(item,template[0],`${path}.${index}`));return;
    }
    if (template && typeof template==='object') {
      if (!data || typeof data!=='object'||Array.isArray(data)) { errors.push(`${path}: neplatná sekce.`);return; }
      for(const key of Object.keys(data)) if(!Object.hasOwn(template,key))errors.push(`${path}.${key}: neznámé pole.`);
      for(const [key,sample] of Object.entries(template)) walk(data[key] ?? (key==='video' ? '' : undefined),sample,path ? `${path}.${key}`:key);
      return;
    }
    if(data!==template)errors.push(`${path}: neplatná verze.`);
  }
  walk(value,defaults,'');
  if(value?.settings && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.settings.email)) errors.push('Kontaktní e-mail není platný.');
  if(Array.isArray(value?.projects)){
    const ids=value.projects.map(p=>p.id);
    if(new Set(ids).size!==ids.length||ids.some(id=>!id||!/^[a-z0-9-]+$/.test(id)))errors.push('Realizace musí mít odlišné identifikátory.');
    for(const p of value.projects)if(!p.title?.trim()||!p.category?.trim())errors.push('Vyplňte název a kategorii realizace.');
  }
  return { valid: !errors.length, errors };
}
