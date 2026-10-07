import { build as viteBuild } from 'vite';
import { build as bundle } from 'esbuild';
import { rm, mkdir, cp, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await viteBuild();
await mkdir('dist/server', { recursive: true });
await bundle({ entryPoints: ['worker/index.js'], bundle: true, outfile: 'dist/server/index.js', format: 'esm', platform: 'browser', target: 'es2022', minify: true });
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
await writeFile('dist/server/wrangler.json', JSON.stringify({ name: 'piskovani-bruzovice', main: 'index.js', compatibility_date: '2026-10-01', assets: { directory: '../client', binding: 'ASSETS', run_worker_first: ['/api/*'] }, d1_databases: [{ binding: 'DB', database_name: 'bruzovice-inquiries', migrations_dir: '../../drizzle' }] }, null, 2));
console.log('Svelte frontend and inquiry Worker are ready.');
