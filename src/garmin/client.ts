import { Platform, type App } from 'obsidian';
import type { GarminClient, MfaState, Tokens, TokenStore } from 'garminconnect-js';

import { createDesktopFetch } from './desktop-http';

export const nativeFetch = createDesktopFetch();

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
export async function newGarminClient(app: App, id: string, store?: TokenStore, fetchImpl: typeof fetch = nativeFetch): Promise<GarminClient> {
 if (!Platform.isDesktop) throw new Error('Garmin connection currently requires Obsidian desktop.');
 // The Node-based client is bundled but initialized only after this desktop guard.
 const { GarminClient } = await import('garminconnect-js');
 return new GarminClient({ tokenStore: store ?? tokenStore(app, id), fetchImpl, timeoutMs: 20_000, retries: 0 });
}
export type { MfaState };
