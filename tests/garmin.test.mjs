import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-garmin-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const platform = { isDesktop: true };
const state = { platform, request: async () => { throw new Error('Unexpected network request'); } };
globalThis.__sportsGarminTest = state;
const output = await build({
 stdin: { contents: "export { parseActivities } from './src/garmin/activities'; export { normalizeGarmin } from './src/garmin/normalize'; export { garminMarkdown } from './src/garmin/render'; export { tokenStore, nativeFetch, newGarminClient } from './src/garmin/client'; export { syncGarmin } from './src/garmin/sync';", resolveDir: process.cwd(), loader: 'ts' },
 bundle: true, format: 'cjs', platform: 'node', write: false,
 plugins: [{ name: 'stub-obsidian', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
  builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const Platform = globalThis.__sportsGarminTest.platform; export const requestUrl = (...args) => globalThis.__sportsGarminTest.request(...args);' }));
 } }],
});
writeFileSync(`${temp}/garmin.cjs`, output.outputFiles[0].text);
const { parseActivities, normalizeGarmin, garminMarkdown, tokenStore, nativeFetch, newGarminClient, syncGarmin } = createRequire(import.meta.url)(`${temp}/garmin.cjs`);
const activity = { id: '123', date: '2026-10-20', time: '20:00', name: 'Swimming', type: 'lap_swimming', duration: 3600, distance: 2000, average_hr: 130 };
const response = (body, headers = {}) => ({ status: 200, headers, arrayBuffer: new TextEncoder().encode(JSON.stringify(body)).buffer });
function fixture() {
 const secrets = new Map(); let saves = 0;
 return {
  data: { garminEnabled: true, garminSecretId: 'sports-test', garminHistoryStart: '2026-10-01', plan: { timezone: 'Europe/Berlin', sessions: [{ id: 'manual', status: 'planned' }] } },
  app: { secretStorage: { getSecret: id => secrets.get(id) ?? null, setSecret: (id, value) => secrets.set(id, value) } },
  save: async () => { saves++; },
  get saves() { return saves; },
 };
}
const tokens = { oauth1: { oauth_token: 'test', oauth_token_secret: 'test' }, oauth2: { access_token: 'test', token_type: 'Bearer', expires_at: 4102444800, refresh_token_expires_at: 4102444800 } };
test('activities whitelist fields, preserve missing vs zero measurements, and deduplicate by ID', () => {
 assert.deepEqual(parseActivities([{ ...activity, gps: 'private route' }, { ...activity, name: 'Updated swim' }], '2026-10-01', '2026-10-31'), [{ ...activity, name: 'Updated swim' }]);
 const blank = parseActivities([{ ...activity, duration: null, distance: 0 }], '2026-10-01', '2026-10-31')[0];
 assert.equal(blank.duration, null); assert.equal(blank.distance, 0);
 assert.throws(() => parseActivities([{ ...activity, average_hr: -1 }], '2026-10-01', '2026-10-31'));
 assert.throws(() => parseActivities([{ ...activity, id: 'abc' }], '2026-10-01', '2026-10-31'));
 assert.throws(() => parseActivities([{ ...activity, date: '2026-02-30' }], '2026-10-01', '2026-10-31'));
});
test('local activity dates take precedence and GMT fallback follows timezone across midnight', () => {
 const rows = [{ activityId: 1, startTimeLocal: '2026-10-20 23:45:00' }, { activityId: 2, startTimeGMT: '2026-10-20 23:30:00' }];
 const result = normalizeGarmin(rows, 'Europe/Berlin', '2026-10-01', '2026-10-31');
 assert.deepEqual(result.map(row => [row.date, row.time]), [['2026-10-20','23:45'], ['2026-10-21','01:30']]);
});
test('secret storage round-trips full tokens separately from ordinary plugin data', async () => {
 const plugin = fixture(); const store = tokenStore(plugin.app, 'test');
 await store.save(tokens); assert.deepEqual(await store.load(), tokens);
 assert.ok(!JSON.stringify(plugin.data).includes('access_token'));
 await store.clear(); assert.equal(await store.load(), null);
 assert.throws(() => tokenStore({}, 'test'), /1.11.4/);
});
test('native transport forwards auth headers, separates cookies and rejects unexpected hosts', async () => {
 let request;
 state.request = async input => { request = input; return response({ ok: true }, { 'set-cookie': 'a=1; Expires=Wed, 21 Oct 2026 10:00:00 GMT, b=2; Path=/' }); };
 const res = await nativeFetch('https://sso.garmin.com/mobile/api/login', { method: 'POST', headers: { cookie: 'session=test' }, body: '{}' });
 assert.equal(request.headers.cookie, 'session=test'); assert.equal(request.body, '{}');
 assert.equal(res.headers.getSetCookie().length, 2);
 await assert.rejects(nativeFetch('https://unexpected.example/test'), /Unexpected/);
 platform.isDesktop = false;
 try { await assert.rejects(newGarminClient(fixture().app, 'test'), /desktop/); }
 finally { platform.isDesktop = true; }
});
test('Garmin sync replaces a successful snapshot, preserves manual status and throttles refreshes', async () => {
 const plugin = fixture(); await tokenStore(plugin.app, 'sports-test').save(tokens);
 plugin.data.garminCache = { activities: [{ ...activity, id: 'deleted' }], lastSuccess: '', lastAttempt: '', start: '', end: '', error: '' };
 let calls = 0;
 state.request = async input => {
  calls++; assert.ok(input.url.startsWith('https://connectapi.garmin.com/activitylist-service/activities/search/activities'));
  if (new URL(input.url).searchParams.get('start') !== '0') return response([]);
  return response([{ activityId: 123, startTimeLocal: '2026-10-20 20:00:00', duration: 3600, activityName: 'Swimming' }]);
 };
 await syncGarmin(plugin);
 assert.equal(plugin.data.garminCache.activities.length, 1);
 assert.equal(plugin.data.garminCache.activities[0].id, '123');
 assert.equal(plugin.data.plan.sessions[0].status, 'planned');
 const priorCalls = calls; await syncGarmin(plugin); assert.equal(calls, priorCalls);
 const snapshot = plugin.data.garminCache.activities;
 state.request = async () => { throw new Error('password=do-not-store'); };
 await syncGarmin(plugin, true);
 assert.deepEqual(plugin.data.garminCache.activities, snapshot);
 assert.ok(plugin.data.garminCache.error);
 assert.ok(!JSON.stringify(plugin.data).includes('do-not-store'));
 plugin.data.garminEnabled = false; const saves = plugin.saves;
 await syncGarmin(plugin, true); assert.equal(plugin.saves, saves);
});
test('Garmin notes escape activity names and filter weekly records without claiming manual completion', () => {
 const cache = { activities: [{ ...activity, name: '<img> [injection](https://example.com)' }], lastSuccess: '', error: '', start: '', end: '' };
 const text = garminMarkdown(cache, ['2026-10-20']);
 assert.ok(text.includes('&lt;img&gt;')); assert.ok(text.includes('\\[injection\\]'));
 assert.ok(text.includes('do not mark manual sessions complete'));
 assert.ok(!garminMarkdown(cache, ['2026-10-21']).includes('2000'));
});

test('bundled client requests MFA inside the sign-in flow without storing the password', async () => {
 const plugin = fixture(); const requests = [];
 state.request = async input => {
  requests.push(input);
  if (input.url.includes('/mobile/api/login')) return response({ responseStatus: { type: 'MFA_REQUIRED' }, customerMfaInfo: { mfaLastMethodUsed: 'email' } });
  return response({});
 };
 const client = await newGarminClient(plugin.app, 'test-mfa');
 const result = await client.login('test@example.com', 'temporary-password');
 assert.equal(result.state, 'mfa_required');
 assert.equal(result.mfaState.mfaMethod, 'email');
 assert.ok(!JSON.stringify(result.mfaState).includes('temporary-password'));
 assert.equal(await tokenStore(plugin.app, 'test-mfa').load(), null);
 assert.equal(JSON.parse(requests.find(row => row.url.includes('/mobile/api/login')).body).username, 'test@example.com');
});
