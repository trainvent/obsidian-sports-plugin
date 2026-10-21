import * as https from 'node:https';
import { Buffer } from 'node:buffer';
import { Platform } from 'obsidian';

interface HttpResult { status: number; headers: Record<string, string | string[]>; arrayBuffer: ArrayBuffer }
export type HttpRequest = (url: string, init: RequestInit) => Promise<HttpResult>;

function allowed(url: URL): boolean {
 return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'garmin.com' || url.hostname.endsWith('.garmin.com') || (url.hostname === 'thegarth.s3.amazonaws.com' && url.pathname === '/oauth_consumer.json'));
}

/** Native HTTPS retains Set-Cookie and redirect Location, unlike requestUrl. */
const request: HttpRequest = async (url, init) => {
 if (!Platform.isDesktop) throw new Error('Garmin requires desktop.');
 const headers: Record<string, string> = {};
 new Headers(init.headers).forEach((value, name) => { headers[name] = value; });
 headers['accept-encoding'] = 'identity';
 if (typeof init.body === 'string') headers['content-length'] = String(Buffer.byteLength(init.body));
 return new Promise((resolve, reject) => {
  const req = https.request(url, { method: init.method ?? 'GET', headers, signal: init.signal ?? undefined }, res => {
   const chunks: Uint8Array[] = []; let size = 0;
   res.on('data', (chunk: Uint8Array) => {
    size += chunk.length;
    if (size > 16 * 1024 * 1024) { res.destroy(new Error('Garmin response too large.')); return; }
    chunks.push(chunk);
   });
   res.on('error', reject);
   res.on('end', () => {
    const bytes = Buffer.concat(chunks);
    const responseHeaders: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) responseHeaders[key] = value;
    resolve({ status: res.statusCode ?? 500, headers: responseHeaders, arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
   });
  });
  req.setTimeout(30_000, () => req.destroy(new Error('Garmin connection timed out.')));
  req.on('error', reject);
  if (typeof init.body === 'string') req.write(init.body);
  req.end();
 });
};

/** Follow redirects explicitly, keeping cookies and their origin and path boundaries. */
export function createDesktopFetch(send: HttpRequest = request): typeof fetch {
 return async (input, initial = {}) => {
  let url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  let method = initial.method ?? 'GET'; let body = initial.body;
  const headers = new Headers(initial.headers);
  const initialOrigin = url.origin;
  const received: { origin: string; cookie: string }[] = [];
  const jar = new Map<string, { name: string; value: string; domain: string; path: string; hostOnly: boolean; expired: boolean }>();
  for (let hop = 0; hop <= 10; hop++) {
   if (!allowed(url)) throw new Error('Unexpected Garmin connection endpoint.');
   if (url.hostname === 'thegarth.s3.amazonaws.com' && method !== 'GET') throw new Error('Unexpected Garmin application key request.');
   if (initial.signal?.aborted) throw new Error('Garmin request cancelled.');
   const outgoing = new Headers(headers);
   if (url.origin !== initialOrigin) { outgoing.delete('authorization'); outgoing.delete('cookie'); }
   const cookies = new Map<string, string>();
   for (const pair of (outgoing.get('cookie') ?? '').split(';')) {
    const split = pair.indexOf('='); if (split > 0) cookies.set(pair.slice(0, split).trim(), pair.slice(split + 1));
   }
   for (const cookie of jar.values()) {
    const domainMatches = cookie.hostOnly ? url.hostname === cookie.domain : url.hostname === cookie.domain || url.hostname.endsWith(`.${cookie.domain}`);
    const pathMatches = url.pathname === cookie.path || url.pathname.startsWith(cookie.path.endsWith('/') ? cookie.path : `${cookie.path}/`);
    if (domainMatches && pathMatches) { if (cookie.expired) cookies.delete(cookie.name); else cookies.set(cookie.name, cookie.value); }
   }
   if (cookies.size) outgoing.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
   else outgoing.delete('cookie');
   const result = await send(url.href, { ...initial, method, body, headers: outgoing });
   const rawCookies = result.headers['set-cookie'];
   const setCookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
   for (const cookie of setCookies) {
    received.push({ origin: url.origin, cookie });
    const [pair = '', ...attributes] = cookie.split(';'); const split = pair.indexOf('=');
    if (split <= 0) continue;
    const attrs = new Map(attributes.map(value => { const i = value.indexOf('='); return [value.slice(0, i < 0 ? undefined : i).trim().toLowerCase(), i < 0 ? '' : value.slice(i + 1).trim()]; }));
    const domain = (attrs.get('domain') || url.hostname).replace(/^\./, '').toLowerCase();
    if (url.hostname !== domain && !url.hostname.endsWith(`.${domain}`)) continue;
    if (domain !== 'garmin.com' && !domain.endsWith('.garmin.com') && domain !== 'thegarth.s3.amazonaws.com') continue;
    const defaultPath = url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1) || '/';
    const path = attrs.get('path')?.startsWith('/') ? attrs.get('path')! : defaultPath;
    const name = pair.slice(0, split).trim();
    const expired = attrs.has('max-age') ? Number(attrs.get('max-age')) <= 0 : attrs.has('expires') && Date.parse(attrs.get('expires')!) <= Date.now();
    jar.set(`${domain}:${path}:${name}`, { name, value: pair.slice(split + 1), domain, path, hostOnly: !attrs.has('domain'), expired });
   }
   const location = result.headers.location;
   if ([301, 302, 303, 307, 308].includes(result.status) && typeof location === 'string') {
    const next = new URL(location, url);
    // Never forward a credential body through a cross-origin redirect.
    if (next.origin !== url.origin && method !== 'GET' && method !== 'HEAD') throw new Error('Unexpected Garmin sign-in redirect.');
    if (result.status === 303 || ([301, 302].includes(result.status) && method === 'POST')) {
     method = 'GET'; body = undefined; headers.delete('content-type'); headers.delete('content-length');
    }
    url = next; continue;
   }
   const responseHeaders = new Headers();
   for (const [name, value] of Object.entries(result.headers)) if (name !== 'set-cookie') responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
   const response = new Response([204, 205, 304].includes(result.status) ? null : result.arrayBuffer, { status: result.status, headers: responseHeaders });
   Object.defineProperty(response.headers, 'getSetCookie', { value: () => received.filter(value => value.origin === url.origin).map(value => value.cookie) });
   Object.defineProperty(response, 'url', { value: url.href });
   return response;
  }
  throw new Error('Too many Garmin sign-in redirects.');
 };
}
