import { Platform, requestUrl, type App } from 'obsidian';
import type { GarminClient, MfaState, Tokens, TokenStore } from 'garminconnect-js';

/** Adapt Obsidian's native transport so desktop requests do not depend on browser CORS. */
export const nativeFetch: typeof fetch = async (input, init) => {
 const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
 const target = new URL(url);
 const allowed = target.protocol === 'https:' && (target.hostname === 'garmin.com' || target.hostname.endsWith('.garmin.com') || target.hostname === 'thegarth.s3.amazonaws.com');
 if (!allowed) throw new Error('Unexpected Garmin connection endpoint.');
 if (init?.signal?.aborted) throw new Error('Garmin request cancelled.');
 const headers: Record<string, string> = {};
 new Headers(init?.headers).forEach((value, key) => { headers[key] = value; });
 const result = await new Promise<Awaited<ReturnType<typeof requestUrl>>>((resolve, reject) => {
  const abort = (): void => reject(new Error('Garmin request cancelled.'));
  init?.signal?.addEventListener('abort', abort, { once: true });
  void requestUrl({ url, method: init?.method ?? 'GET', headers, body: typeof init?.body === 'string' ? init.body : undefined, throw: false }).then(resolve, reject).finally(() => init?.signal?.removeEventListener('abort', abort));
 });
 if (init?.signal?.aborted) throw new Error('Garmin request cancelled.');
 const response = new Response([204, 205, 304].includes(result.status) ? null : result.arrayBuffer, { status: result.status, headers: result.headers });
 // Keep multiple Set-Cookie values separate, including cookies containing Expires commas.
 const cookies = Object.entries(result.headers).find(([key]) => key.toLowerCase() === 'set-cookie')?.[1];
 Object.defineProperty(response.headers, 'getSetCookie', { value: () => cookies ? cookies.split(/,(?=\s*[^;,=\s]+=)/) : [] });
 Object.defineProperty(response, 'url', { value: url });
 return response;
};

/** Tokens use Obsidian's secret store, never plugin data.json or generated notes. */
export function tokenStore(app: App, id: string): TokenStore {
 if (!app.secretStorage) throw new Error('Garmin sign-in requires Obsidian 1.11.4 or later.');
 return {
  load: () => {
   const value = app.secretStorage.getSecret(id);
   return Promise.resolve(value ? JSON.parse(value) as Tokens : null);
  },
  save: tokens => { app.secretStorage.setSecret(id, JSON.stringify(tokens)); return Promise.resolve(); },
  clear: () => { app.secretStorage.setSecret(id, ''); return Promise.resolve(); },
 };
}
export async function newGarminClient(app: App, id: string, store?: TokenStore): Promise<GarminClient> {
 if (!Platform.isDesktop) throw new Error('Garmin connection currently requires Obsidian desktop.');
 // The Node-based client is bundled but initialized only after this desktop guard.
 const { GarminClient } = await import('garminconnect-js');
 return new GarminClient({ tokenStore: store ?? tokenStore(app, id), fetchImpl: nativeFetch, timeoutMs: 20_000, retries: 0 });
}
export type { MfaState };
