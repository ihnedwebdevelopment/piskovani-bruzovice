import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { loadContent } from './lib/content-store.js';

if (location.pathname.replace(/\/$/, '') === '/admin') {
  import('./admin/Admin.svelte').then(({ default: Admin }) => mount(Admin, { target: document.getElementById('app') }));
} else {
  mount(App, { target: document.getElementById('app') });
  loadContent();
}
