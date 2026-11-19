// Vercel-only Node adapter for the TALLAH React SSR worker.
//
// `vite build` (unchanged, the same build Salla publishes) emits a standard
// fetch-style worker at dist/server/index.js. This file is copied next to it
// inside .vercel/output/functions/__ssr.func and bridges Vercel's Node
// (req, res) invocation to that worker's `fetch(request, env, ctx)`.
// It is never part of the theme Salla builds or serves.
import { Readable } from 'node:stream';
import worker from './index.js';

// The engine resolves the store from the request host when the host is not a
// Salla preview/loopback host, so on *.vercel.app it would look up a store
// called "tallah-theme-react.vercel.app". The engine's documented injection
// point (__SALLA_RUNTIME_ENV__) pins the store instead. It is published to the
// browser by the engine, so SSR and hydration query the same store.
// Default: Salla's public Raed demo store (demostore.salla.sa/ar/dev-vgckq3fssfhjewwi).
// Override per environment with PREVIEW_STORE_DOMAIN (a store username or id).
const PREVIEW_STORE = process.env.PREVIEW_STORE_DOMAIN || process.env.VITE_STORE_DOMAIN || 'dev-vgckq3fssfhjewwi';
globalThis.__SALLA_RUNTIME_ENV__ = {
  ...(globalThis.__SALLA_RUNTIME_ENV__ ?? {}),
  storeIdentifier: PREVIEW_STORE,
};

function vercelWaitUntil(promise) {
  try {
    const ctx = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
    if (ctx?.waitUntil) return ctx.waitUntil(promise);
  } catch {}
  promise?.catch?.(() => {});
}

const executionContext = {
  waitUntil: vercelWaitUntil,
  passThroughOnException() {},
};

function toRequest(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = new URL(req.url || '/', `${proto}://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.set(key, value);
  }
  const controller = new AbortController();
  req.on('close', () => controller.abort());
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
    signal: controller.signal,
  });
}

async function sendResponse(res, response) {
  res.statusCode = response.status;
  if (response.statusText) res.statusMessage = response.statusText;
  const cookies = response.headers.getSetCookie?.() ?? [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });
  if (cookies.length) res.setHeader('set-cookie', cookies);
  if (!response.body) return res.end();
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) await new Promise((r) => res.once('drain', r));
    }
  } finally {
    res.end();
  }
}

export default async function handler(req, res) {
  try {
    const response = await worker.fetch(toRequest(req), process.env, executionContext);
    await sendResponse(res, response);
  } catch (error) {
    console.error('[tallah-vercel] SSR failed', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
    }
    res.end('Internal Server Error');
  }
}
