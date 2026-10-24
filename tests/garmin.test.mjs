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
 stdin: { contents: "export { garminSignInError } from './src/garmin/errors'; export { createDesktopFetch } from './src/garmin/desktop-http'; export { parseActivities } from './src/garmin/activities'; export { normalizeGarmin } from './src/garmin/normalize'; export { garminMarkdown } from './src/garmin/render'; export { tokenStore, nativeFetch, newGarminClient } from './src/garmin/client'; export { normalizeCoach, syncCoach } from './src/garmin/coach'; export { coachPlansMarkdown } from './src/notes/coach-plans'; export { syncGarmin } from './src/garmin/sync';", resolveDir: process.cwd(), loader: 'ts' },
 bundle: true, format: 'cjs', platform: 'node', write: false,
 plugins: [{ name: 'stub-obsidian', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
  builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const normalizePath = value => value; export class TFile {} export class TFolder {} export const Platform = globalThis.__sportsGarminTest.platform; export const requestUrl = (...args) => globalThis.__sportsGarminTest.request(...args);' }));
 } }],
});
writeFileSync(`${temp}/garmin.cjs`, output.outputFiles[0].text);
const built = createRequire(import.meta.url)(`${temp}/garmin.cjs`);
const { parseActivities, normalizeGarmin, garminMarkdown, tokenStore, createDesktopFetch, garminSignInError } = built;
const nativeFetch = createDesktopFetch((url, init) => state.request({ ...init, url, headers: Object.fromEntries(init.headers) }));
const newGarminClient = (app, id, store) => built.newGarminClient(app, id, store, nativeFetch);
const syncGarmin = (plugin, force) => built.syncGarmin(plugin, force, newGarminClient);
const activity = { id: '123', date: '2026-10-20', time: '20:00', name: 'Swimming', type: 'lap_swimming', duration: 3600, distance: 2000, average_hr: 130, hr_zones: null };
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
 state.request = async input => { request = input; return response({ ok: true }, { 'set-cookie': ['a=1; Expires=Wed, 21 Oct 2036 10:00:00 GMT', 'b=2; Path=/'] }); };
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
  calls++;
  if (input.url.endsWith('/hrTimeInZones')) return response([{ zoneNumber: 2, secsInZone: 600 }, { zoneNumber: 4, secsInZone: 1800 }]);
  assert.ok(input.url.startsWith('https://connectapi.garmin.com/activitylist-service/activities/search/activities'));
  if (new URL(input.url).searchParams.get('start') !== '0') return response([]);
  return response([{ activityId: 123, startTimeLocal: '2026-10-20 20:00:00', duration: 3600, activityName: 'Swimming' }]);
 };
 await syncGarmin(plugin);
 assert.equal(plugin.data.garminCache.activities.length, 1);
 assert.equal(plugin.data.garminCache.activities[0].id, '123');
 assert.deepEqual(plugin.data.garminCache.activities[0].hr_zones, [0, 600, 0, 1800, 0]);
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

test('sign-in redirects retain cookies and the final URL without forwarding passwords across hosts', async () => {
 const requests = [];
 const fetcher = createDesktopFetch(async (url, init) => {
  requests.push({ url, init });
  if (requests.length === 1) return { ...response({}), status: 302, headers: { location: '/sso/signin', 'set-cookie': ['session=redirect-cookie; Path=/; Secure'] } };
  return response({ ready: true });
 });
 const result = await fetcher('https://sso.garmin.com/sso/embed', { headers: { cookie: 'initial=value' } });
 assert.equal(result.url, 'https://sso.garmin.com/sso/signin');
 assert.ok(requests[1].init.headers.get('cookie').includes('session=redirect-cookie'));
 assert.ok(requests[1].init.headers.get('cookie').includes('initial=value'));
 assert.deepEqual(result.headers.getSetCookie(), ['session=redirect-cookie; Path=/; Secure']);
 let calls = 0;
 const blocked = createDesktopFetch(async () => { calls++; return { ...response({}), status: 307, headers: { location: 'https://thegarth.s3.amazonaws.com/oauth_consumer.json' } }; });
 await assert.rejects(blocked('https://sso.garmin.com/mobile/api/login', { method: 'POST', body: 'password=secret' }), /redirect/);
 assert.equal(calls, 1);
});

test('redirect cookies respect paths and an unrelated origin never receives authentication headers', async () => {
 let step = 0;
 const fetcher = createDesktopFetch(async (url, init) => {
  step++;
  if (step === 1) return { ...response({}), status: 302, headers: { location: '/other', 'set-cookie': ['private=value; Path=/private', 'forged=value; Domain=example.com; Path=/'] } };
  if (step === 2) {
   assert.ok(!init.headers.get('cookie'));
   return { ...response({}), status: 302, headers: { location: 'https://connectapi.garmin.com/public' } };
  }
  assert.equal(init.headers.get('authorization'), null);
  assert.equal(init.headers.get('cookie'), null);
  return response({});
 });
 await fetcher('https://sso.garmin.com/private/start', { headers: { authorization: 'Bearer test' } });
});

test('sign-in errors distinguish connection failures and explicit credential rejections without leaking secrets', () => {
 assert.ok(garminSignInError(new Error('Not authorized for https://sso.garmin.com/path?password=secret (403)')).includes('blocked-sign-in'));
 assert.ok(garminSignInError(new Error('Rate limited by Garmin at https://connectapi.garmin.com/oauth-service/oauth/preauthorized?ticket=secret')).includes('http-429-token-exchange'));
 assert.ok(garminSignInError(new Error('SSO error: INVALID_USERNAME_PASSWORD')).includes('credentials-rejected'));
 assert.ok(garminSignInError({ cause: { code: 'ENOTFOUND' } }).includes('network-connection'));
 assert.ok(garminSignInError(new Error('raw token secret'), true).includes('save-connection'));
 for (const error of [new Error('password=secret'), { status: 429, body: 'secret' }, new Error('Cloudflare challenge secret')]) assert.ok(!garminSignInError(error).includes('secret'));
});

test('native HTTPS sends a complete credential body with an explicit byte length', async () => {
 const { default: https } = await import('node:https');
 const { EventEmitter } = await import('node:events');
 const original = https.request;
 let observed; let written = '';
 https.request = (url, options, receive) => {
  observed = options;
  const req = new EventEmitter();
  req.setTimeout = () => {};
  req.write = chunk => { written += chunk; };
  req.end = () => queueMicrotask(() => {
   const res = new EventEmitter(); res.statusCode = 200; res.headers = {};
   receive(res); res.emit('data', Buffer.from('{}')); res.emit('end');
  });
  return req;
 };
 try {
  const body = JSON.stringify({ username: 'test@example.com', password: 'test-ä' });
  const result = await built.nativeFetch('https://sso.garmin.com/mobile/api/login', { method: 'POST', body });
  assert.equal(written, body);
  assert.equal(Number(observed.headers['content-length']), Buffer.byteLength(body));
  assert.equal(observed.headers['accept-encoding'], 'identity');
  assert.deepEqual(await result.json(), {});
 } finally { https.request = original; }
});

const coachRow = { fbtAdaptivePlanId: 12, workoutUuid: 'workout-1', scheduleDate: '2026-10-22', workoutName: 'Easy | run', workoutType: 'running', estimatedDurationInSecs: 1800, estimatedDistanceInMeters: 5000 };
test('Coach summaries exclude ordinary, completed and out-of-range workouts and retain rest days', () => {
 const rows = built.normalizeCoach([coachRow, coachRow, { ...coachRow, fbtAdaptivePlanId: null }, { ...coachRow, associatedActivityId: 9 }, { ...coachRow, scheduleDate: '2026-11-29' }, { ...coachRow, workoutUuid: null, isRestDay: true, workoutName: null }], '2026-10-21', '2026-11-17');
 assert.equal(rows.length, 2);
 assert.ok(rows.some(row => row.name === 'Rest day'));
 assert.throws(() => built.normalizeCoach([{ ...coachRow, estimatedDurationInSecs: -1 }], '2026-10-21', '2026-11-17'));
 const cache = { workouts: rows, start: '2026-10-21', end: '2026-11-17', lastSuccess: '2026-10-21', error: 'Cached warning' };
 assert.equal(built.coachPlansMarkdown(false, cache), '');
 const markdown = built.coachPlansMarkdown(true, cache, 'UTC', new Date('2026-10-21T12:00:00Z'));
 assert.match(markdown, /Easy &#124; run/); assert.match(markdown, /30.0/); assert.match(markdown, /Cached warning/);
 assert.doesNotMatch(built.coachPlansMarkdown(true, cache, 'UTC', new Date('2026-10-23T12:00:00Z')), /Easy/);
});
test('Coach opt-in, successful snapshot replacement, throttle and failure preserve independent activity data', async () => {
 const plugin = fixture(); await tokenStore(plugin.app, plugin.data.garminSecretId).save(tokens);
 let requests = 0;
 state.request = async input => { requests++; assert.match(input.url, /graphql/); return response({ data: { workoutScheduleSummariesScalar: [] } }); };
 await built.syncCoach(plugin, true, newGarminClient); assert.equal(requests, 0);
 plugin.data.showGarminCoachPlans = true;
 plugin.data.garminCoachCache = { workouts: [coachRow], lastAttempt: '', lastSuccess: 'old', error: '' };
 plugin.data.garminCache = { activities: [activity] };
 await built.syncCoach(plugin, true, newGarminClient);
 assert.equal(requests, 1); assert.deepEqual(plugin.data.garminCoachCache.workouts, []);
 assert.equal(plugin.data.garminCoachCache.error, '');
 await built.syncCoach(plugin, false, newGarminClient); assert.equal(requests, 1);
 const previous = plugin.data.garminCoachCache;
 state.request = async () => { throw new Error('private diagnostic'); };
 await built.syncCoach(plugin, true, newGarminClient);
 assert.equal(plugin.data.garminCoachCache.lastSuccess, previous.lastSuccess);
 assert.match(plugin.data.garminCoachCache.error, /refresh failed/);
 assert.doesNotMatch(plugin.data.garminCoachCache.error, /private diagnostic/);
 assert.deepEqual(plugin.data.garminCache.activities, [activity]);
});

test('an existing activity cache backfills zones immediately despite a recent refresh', async () => {
 const plugin = fixture(); await tokenStore(plugin.app, 'sports-test').save(tokens);
 const recent = new Date().toISOString();
 plugin.data.garminCache = { activities: [{ ...activity }], lastSuccess: recent, lastAttempt: recent, start: '2026-10-01', end: '2026-10-23', error: '' };
 let zoneCalls = 0;
 state.request = async input => {
  if (input.url.endsWith('/hrTimeInZones')) { zoneCalls++; return response([{ zoneNumber: 3, secsInZone: 1200 }]); }
  return response(new URL(input.url).searchParams.get('start') === '0' ? [{ activityId: 123, startTimeLocal: '2026-10-20 20:00:00', duration: 3600 }] : []);
 };
 await syncGarmin(plugin);
 assert.equal(zoneCalls, 1);
 assert.equal(plugin.data.garminCache.zonesImported, true);
 assert.deepEqual(plugin.data.garminCache.activities[0].hr_zones, [0, 0, 1200, 0, 0]);
 await syncGarmin(plugin);
 assert.equal(zoneCalls, 1);
});

test('zone request failures keep activities and explain missing chart data without leaking responses', async () => {
 const plugin = fixture(); await tokenStore(plugin.app, 'sports-test').save(tokens);
 state.request = async input => {
  if (input.url.endsWith('/hrTimeInZones')) throw new Error('private response');
  return response(new URL(input.url).searchParams.get('start') === '0' ? [{ activityId: 123, startTimeLocal: '2026-10-20 20:00:00', duration: 3600 }] : []);
 };
 await syncGarmin(plugin, true);
 assert.equal(plugin.data.garminCache.activities.length, 1);
 assert.match(plugin.data.garminCache.error, /zones could not be fetched/);
 assert.ok(!JSON.stringify(plugin.data.garminCache).includes('private response'));
});
