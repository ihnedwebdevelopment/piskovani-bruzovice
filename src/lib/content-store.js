import { writable } from 'svelte/store';
import { defaults, validateContent } from './content-schema.js';
export const siteContent = writable(structuredClone(defaults));
export async function loadContent() {
  try {
    const response=await fetch('/api/content', {cache:'no-store'});
    if(!response.ok)return;
    const content=await response.json();
    if(validateContent(content).valid) siteContent.set(content);
  } catch { /* The bundled content remains available while offline. */ }
}
