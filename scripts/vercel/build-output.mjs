// Vercel-only: turns the normal `vite build` output (dist/) into Vercel's
// Build Output API v3 (.vercel/output). Runs only via `pnpm build:vercel`,
// which vercel.json sets as the Vercel build command. `pnpm build`, `pnpm dev`,
// `pnpm preview` and Salla's own build/publish pipeline never run this file.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const out = join(root, '.vercel/output');
const fn = join(out, 'functions/__ssr.func');

for (const p of ['client', 'server/index.js']) {
  if (!existsSync(join(dist, p))) {
    console.error(`[vercel] dist/${p} is missing. Run \`vite build\` first.`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });

// Static assets (hashed JS/CSS, public/ files). dist/stats.html stays out.
cpSync(join(dist, 'client'), join(out, 'static'), {
  recursive: true,
  filter: (src) => !src.endsWith('_headers') && !src.endsWith('.assetsignore'),
});

// SSR worker bundle + Node adapter. wrangler.json is Cloudflare-only metadata.
cpSync(join(dist, 'server'), fn, {
  recursive: true,
  filter: (src) => !src.endsWith('wrangler.json'),
});
cpSync(join(import.meta.dirname, 'handler.mjs'), join(fn, 'handler.mjs'));
writeFileSync(join(fn, 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
writeFileSync(
  join(fn, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs24.x',
      handler: 'handler.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      maxDuration: 30,
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: '^/assets/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        { handle: 'filesystem' },
        { src: '^/(.*)$', dest: '/__ssr' },
      ],
      framework: { slug: 'tanstack-start' },
    },
    null,
    2,
  ) + '\n',
);

console.log('[vercel] Build Output API written to .vercel/output (static + __ssr function)');
