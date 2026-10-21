import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const temp = mkdtempSync(`${tmpdir()}/sports-note-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({
 stdin: { contents: "export { calendarMarkdown } from './src/notes/calendar'; export { syncCoachOnlyPlans } from './src/notes/coach-plans'; export { syncNotes } from './src/notes/sync'; export { clearImportCache } from './src/notes/cache';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', platform: 'browser', write: false, loader: { '.md': 'text' },
 plugins: [{ name: 'obsidian-test-vault', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
  builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export class TFile { constructor(path) { this.path = path; } } export const normalizePath = path => path;' }));
 } }],
});
writeFileSync(`${temp}/sync.mjs`, output.outputFiles[0].text + '\nexport { TFile };');
// eslint-disable-next-line no-unsanitized/method -- Imports our own esbuild output from a private temporary directory.
const { calendarMarkdown, syncCoachOnlyPlans, syncNotes, clearImportCache, TFile } = await import(pathToFileURL(`${temp}/sync.mjs`).href);

function fixture() {
 const files = new Map();
 const plan = { id: 'test', name: 'Test', timezone: 'Europe/Berlin', goals: [], parts: [], sessions: [], weekPlans: [{ week: 1, start: '2026-12-28', phase: 'Foundation', focus: 'Record baseline', targets: '', advanceWhen: '', minutes: 120 }] };
 const plugin = {
  data: { notesFolder: 'Sports', strategySheet: 'Strategy', trackingSheet: 'Training log', generatedBlocks: {}, events: [] },
  save: async () => {},
  app: { fileManager: { renameFile: async (file, path) => { files.delete(file.path); file.path = path; files.set(path, file); } }, vault: {
   read: async file => file.content,
   getAbstractFileByPath: path => files.get(path),
   createFolder: async path => { files.set(path, { path }); },
   create: async (path, content) => { const file = new TFile(path); file.content = content; files.set(path, file); return file; },
   process: async (file, transform) => { file.content = transform(file.content); },
  } },
 };
 return { plugin, plan, files };
}

test('sync creates browsable notes and future weeks without first opening the dashboard', async () => {
 const { plugin, plan, files } = fixture();
 assert.deepEqual(await syncNotes(plugin, plan), []);
 for (const path of ['Sports/Plans.md', 'Sports/Log.md', 'Sports/Strategy.md', 'Sports/Weeks/2026-12-28.md']) assert.ok(files.get(path) instanceof TFile, path);
 assert.ok(files.get('Sports/Plans.md').content.includes('[[Sports/Weeks/2026-12-28\\|2026-12-28]]'));
 assert.ok(files.get('Sports/Weeks/2026-12-28.md').content.includes('Record baseline'));
 const log = files.get('Sports/Log.md');
 log.content += '\nPersonal reflection\n';
 const original = log.content;
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.equal(log.content, original);
});

test('a protected-note conflict does not prevent other weeks from being created', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 const log = files.get('Sports/Log.md');
 const beforeEdit = log.content;
 log.content = log.content.replace('No log entries', 'My own generated-section edit');
 assert.notEqual(log.content, beforeEdit);
 const edited = log.content;
 plan.weekPlans.push({ ...plan.weekPlans[0], week: 2, start: '2027-01-04' });
 const issues = await syncNotes(plugin, plan);
 assert.equal(issues.length, 1);
 assert.match(issues[0], /Log.md.*edited/);
 assert.equal(log.content, edited);
 assert.ok(files.has('Sports/Weeks/2027-01-04.md'));
 files.delete('Sports/Weeks/2027-01-04.md');
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.includes('removed')));
 assert.ok(!files.has('Sports/Weeks/2027-01-04.md'));
});

test('changing regular-activity visibility refreshes notes while preserving the strategy and reflections', async () => {
 const { plugin, plan, files } = fixture();
 plan.weeklySchedule = [{ id: 'swim', weekday: 1, time: '20:00', minutes: 60, title: 'Regular swim', recordedBy: 'Tracker', notes: '' }];
 await syncNotes(plugin, plan);
 const week = files.get('Sports/Weeks/2026-12-28.md');
 week.content += '\nKeep my review\n';
 assert.ok(!week.content.includes('Regular swim'));
 assert.ok(files.get('Sports/Strategy.md').content.includes('Regular swim'));
 plugin.data.showRegularActivities = true;
 await syncNotes(plugin, plan);
 assert.ok(week.content.includes('20:00 Regular swim'));
 plugin.data.showRegularActivities = false;
 await syncNotes(plugin, plan);
 assert.ok(!week.content.includes('Regular swim'));
 assert.ok(week.content.endsWith('Keep my review\n'));
});

test('legacy names migrate once with commentary and trusted baselines preserved', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 for (const [current, legacy, id] of [['Plans.md', 'Plan.md', 'plan'], ['Log.md', 'complete-log.md', 'training-log']]) {
  const file = files.get(`Sports/${current}`);
  file.content += '\nKeep my personal changes\n';
  await plugin.app.fileManager.renameFile(file, `Sports/${legacy}`);
  plugin.data.generatedBlocks[`Sports/${legacy}:${id}`] = plugin.data.generatedBlocks[`Sports/${current}:${id}`];
  delete plugin.data.generatedBlocks[`Sports/${current}:${id}`];
 }
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.ok(!files.has('Sports/Plan.md'));
 assert.ok(!files.has('Sports/complete-log.md'));
 assert.ok(files.get('Sports/Plans.md').content.endsWith('Keep my personal changes\n'));
 assert.ok(files.get('Sports/Log.md').content.endsWith('Keep my personal changes\n'));
 assert.deepEqual(await syncNotes(plugin, plan), []);
});

test('migration preserves duplicate destinations and accepts an already renamed trusted note', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 const baseline = plugin.data.generatedBlocks['Sports/Log.md:training-log'];
 plugin.data.generatedBlocks['Sports/complete-log.md:training-log'] = baseline;
 delete plugin.data.generatedBlocks['Sports/Log.md:training-log'];
 assert.deepEqual(await syncNotes(plugin, plan), []);
 const old = new TFile('Sports/complete-log.md'); old.content = 'Personal old note'; files.set(old.path, old);
 plugin.data.generatedBlocks['Sports/complete-log.md:training-log'] = baseline;
 const original = files.get('Sports/Log.md').content;
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.includes('Both')));
 assert.equal(files.get('Sports/Log.md').content, original);
 assert.equal(old.content, 'Personal old note');
});

test('original Fitness notes managed by the Python scripts are preserved', async () => {
 const { plugin, plan, files } = fixture();
 const original = new TFile('Sports/Log.md');
 original.content = '# My log\n<!-- complete-log:start -->\nGarmin history\n<!-- complete-log:end -->\nPersonal reflection';
 files.set(original.path, original);
 const before = original.content;
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.includes('existing Fitness refresh scripts')));
 assert.equal(original.content, before);
 assert.ok(files.has('Sports/Plans.md'));
});

test('explicit recovery recreates deleted current notes without overwriting edited notes or reviving old weeks', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 files.delete('Sports/Plans.md');
 files.delete('Sports/Log.md');
 files.delete('Sports/Weeks/2026-12-28.md');
 plugin.data.generatedBlocks['Sports/Weeks/2025-01-06.md:week:2025-01-06'] = 'old baseline';
 const strategy = files.get('Sports/Strategy.md');
 strategy.content = strategy.content.replace('## Test', '## My own strategy edit');
 strategy.content += '\nKeep my commentary\n';
 const original = strategy.content;
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.includes('Recreate missing notes')));
 const issues = await syncNotes(plugin, plan, true);
 assert.equal(issues.length, 1);
 assert.match(issues[0], /Strategy.md.*edited/);
 for (const path of ['Sports/Plans.md', 'Sports/Log.md', 'Sports/Weeks/2026-12-28.md']) assert.ok(files.has(path), path);
 assert.equal(strategy.content, original);
 assert.ok(!files.has('Sports/Weeks/2025-01-06.md'));
 assert.ok(!(await syncNotes(plugin, plan)).some(issue => issue.includes('removed')));
});

test('clear cache keeps settings and files, then backs up stale generated notes before rebuilding', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 const log = files.get('Sports/Log.md');
 log.content = log.content.replace('No training log entries for today or earlier.', 'Edited generated output') + '\nMy personal reflection\n';
 const before = log.content;
 plugin.data.plan = plan; plugin.data.lastError = 'Stale baseline';
 plugin.data.workbookPath = '/chosen/workbook.xlsx';
 plugin.data.events = [{ id: 'recurring' }];
 clearImportCache(plugin.data);
 assert.equal(plugin.data.plan, null);
 assert.deepEqual(plugin.data.generatedBlocks, {});
 assert.equal(plugin.data.lastError, '');
 assert.equal(plugin.data.workbookPath, '/chosen/workbook.xlsx');
 assert.equal(plugin.data.events[0].id, 'recurring');
 assert.equal(log.content, before);
 assert.equal(plugin.data.resetNoteBaselines, true);
 assert.deepEqual(await syncNotes(plugin, plan), []);
 const backups = [...files.entries()].filter(([path, file]) => path.includes('/Backups/') && file instanceof TFile);
 assert.ok(backups.some(([path, file]) => path.endsWith('/Log.md') && file.content === before));
 assert.ok(log.content.endsWith('My personal reflection\n'));
 assert.ok(!log.content.includes('Edited generated output'));
 assert.equal(plugin.data.resetNoteBaselines, false);
 const count = backups.length;
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.equal([...files.keys()].filter(path => path.includes('/Backups/') && path.endsWith('.md')).length, count);
});

test('cache recovery leaves malformed generated sections untouched and remains retryable', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 const log = files.get('Sports/Log.md');
 log.content = log.content.replace('<!-- sports:end training-log -->', '');
 const before = log.content;
 clearImportCache(plugin.data);
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.includes('incomplete')));
 assert.equal(log.content, before);
 assert.equal(plugin.data.resetNoteBaselines, true);
});

test('sheet guide lives in the configured vault Guide folder and preserves edits', async () => {
 const { plugin, plan, files } = fixture();
 plugin.data.notesFolder = 'Training/Sports';
 assert.deepEqual(await syncNotes(plugin, plan), []);
 const guide = files.get('Training/Sports/Guide/SHEET_GUIDE.md');
 assert.ok(guide instanceof TFile);
 assert.ok(guide.content.includes('Exercise arsenal'));
 guide.content = 'My adapted guide';
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.equal(guide.content, 'My adapted guide');
 assert.ok(!files.has('Training/Sports/SHEET_GUIDE.md'));
});

test('Garmin adds recorded history and weekly notes while preserving manual sessions and commentary', async () => {
 const { plugin, plan, files } = fixture();
 const activity = { id: '123', date: '2026-10-20', time: '20:00', name: 'Pool swim', type: 'lap_swimming', duration: 3600, distance: 2000, average_hr: 130 };
 plugin.data.garminCache = { activities: [activity], lastSuccess: '2026-10-21T10:00:00Z', lastAttempt: '', start: '2026-10-01', end: '2026-10-21', error: '' };
 const original = JSON.stringify(plan);
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.ok(files.get('Sports/Log.md').content.includes('Pool swim'));
 const week = files.get('Sports/Weeks/2026-10-19.md');
 assert.ok(week.content.includes('Pool swim'));
 assert.ok(!files.get('Sports/Weeks/2026-12-28.md').content.includes('Pool swim'));
 week.content += '\nPersonal reflections';
 plugin.data.garminCache.error = 'Garmin is disconnected.';
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.ok(week.content.endsWith('Personal reflections'));
 assert.ok(week.content.includes('Garmin is disconnected.'));
 assert.equal(JSON.stringify(plan), original);
});

test('weekly notes use the workbook schedule and ignore legacy plugin-local recurring activities', async () => {
 const { plugin, plan, files } = fixture();
 plugin.data.showRegularActivities = true;
 plugin.data.events = [{ id: 'old', title: 'Legacy local activity', sport: 'running', weekday: 1, time: '09:00', minutes: 30, startDate: '2026-01-01', endDate: '' }];
 plan.weeklySchedule = [{ id: 'xlsx', title: 'Workbook swim', weekday: 1, time: '20:00', minutes: 60, recordedBy: 'Tracker', notes: '' }];
 assert.deepEqual(await syncNotes(plugin, plan), []);
 const weekly = files.get('Sports/Weeks/2026-12-28.md').content;
 assert.ok(weekly.includes('Workbook swim'));
 assert.ok(!weekly.includes('Legacy local activity'));
 plugin.data.showRegularActivities = false;
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.ok(!files.get('Sports/Weeks/2026-12-28.md').content.includes('Workbook swim'));
 assert.ok(files.get('Sports/Strategy.md').content.includes('Workbook swim'));
});

test('goal files sync both sources, keep reviews on updates, and isolate generated-section conflicts', async () => {
 const { plugin, plan, files } = fixture();
 plan.goals = [{ id: 'running', title: 'Running', category: 'milestone', benchmark: 'Faster 5 km' }, { id: 'hspu', title: 'Handstand push-up', category: 'maintenance', benchmark: 'Maintain control' }];
 plan.sessions = [{ id: 's1', date: '2026-10-21', title: 'Practice', status: 'planned', notes: 'Session notes', partId: '', partVersion: '', plannedMinutes: null, actualMinutes: null, result: '', results: { 'Running result': 'Good cadence', 'HSPU result': 'Three reps' } }];
 plugin.data.garminCache = { activities: [{ id: '123', date: '2026-10-21', time: '09:00', name: 'Laufen', type: 'running', duration: 1800, distance: 5000, average_hr: 140 }], lastSuccess: '', error: '', start: '', end: '' };
 assert.deepEqual(await syncNotes(plugin, plan), []);
 const running = files.get('Sports/Goals/running.md');
 const hspu = files.get('Sports/Goals/hspu.md');
 assert.ok(running.content.includes('Good cadence') && running.content.includes('[Laufen]'));
 assert.ok(hspu.content.includes('Three reps'));
 assert.ok(!hspu.content.includes('Good cadence') && !hspu.content.includes('[Laufen]'));
 assert.ok(files.get('Sports/Plans.md').content.includes('Sports/Goals/running'));
 assert.ok(files.get('Sports/Strategy.md').content.includes('[[Sports/Goals/running|Running]]'));
 running.content += '\nMy later review: keep this.\n';
 plan.sessions[0].results['Running result'] = 'Improved cadence';
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.ok(running.content.includes('Improved cadence'));
 assert.ok(running.content.endsWith('My later review: keep this.\n'));
 hspu.content = hspu.content.replace('Three reps', 'Edited generated entry');
 const preserved = hspu.content;
 plan.sessions[0].results['Running result'] = 'Next run';
 const issues = await syncNotes(plugin, plan);
 assert.ok(issues.some(issue => issue.startsWith('Goals/hspu.md:')));
 assert.equal(hspu.content, preserved);
 assert.ok(running.content.includes('Next run'));
 assert.equal(plan.sessions[0].status, 'planned');
});

test('optional Coach schedule shares Plans with workbook content and preserves reflections when disabled', async () => {
 const { plugin, plan, files } = fixture();
 plugin.data.showGarminCoachPlans = true;
 plugin.data.garminCoachCache = { workouts: [{ id: 'coach', date: '2099-01-01', name: 'Coach easy run', sport: 'running', plan: 'Race plan', description: 'Easy', duration: 1800, distance: null }], start: '2099-01-01', end: '2099-01-28', lastSuccess: '2026-10-21', error: '' };
 assert.deepEqual(await syncNotes(plugin, plan), []);
 const note = files.get('Sports/Plans.md');
 assert.match(note.content, /Coach easy run/); assert.match(note.content, /2026-12-28/);
 note.content += '\nMy personal review\n';
 plugin.data.showGarminCoachPlans = false;
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.doesNotMatch(note.content, /Coach easy run/);
 assert.match(note.content, /My personal review/); assert.match(note.content, /2026-12-28/);
});

test('calendar combines same-day sources, multiple workouts, source-only dates and respects Coach visibility', () => {
 const { plan } = fixture();
 plan.sessions = [
  { date: '2026-10-21', title: 'Strength | A', plannedMinutes: 30, prescription: 'Pull-ups', notes: '' },
  { date: '2026-10-21', title: 'Mobility', plannedMinutes: null, notes: '' },
  { date: '2026-10-23', title: 'Leg day', plannedMinutes: 20 },
  { date: '2026-10-20', title: 'Past session', plannedMinutes: 20 },
 ];
 const cache = { lastSuccess: '2026-10-21', start: '2026-10-21', end: '2026-11-17', error: 'Cached schedule warning', workouts: [
  { date: '2026-10-21', name: 'Easy run', plan: 'Coach', sport: 'running', duration: 1800, distance: 5000, description: 'Easy' },
  { date: '2026-10-21', name: 'Second run', plan: 'Coach', sport: 'running', duration: null, distance: null, description: '' },
  { date: '2026-10-22', name: 'Rest day', plan: 'Coach', sport: '', duration: null, distance: null, description: '' },
 ] };
 const now = new Date('2026-10-21T12:00:00Z');
 const body = calendarMarkdown(plan, true, cache, now);
 assert.equal(body.split('\n').filter(line => line.startsWith('| 2026-10-21 |')).length, 1);
 assert.match(body, /Strength &#124; A.*Mobility.*Easy run.*Second run/);
 assert.match(body, /2026-10-22.*Rest day/); assert.match(body, /2026-10-23.*Leg day/);
 assert.match(body, /Cached schedule warning/); assert.doesNotMatch(body, /Past session/);
 assert.doesNotMatch(calendarMarkdown(plan, false, cache, now), /Easy run|2026-10-22|Cached schedule warning/);
});
test('calendar sync preserves reviews, protects generated edits and supports Coach without a workbook', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 const calendar = files.get('Sports/Calendar.md');
 assert.ok(calendar); calendar.content += '\nPersonal calendar review\n';
 await syncNotes(plugin, plan); assert.match(calendar.content, /Personal calendar review/);
 calendar.content = calendar.content.replace('Multiple workouts', 'My edited workouts');
 const edited = calendar.content;
 plugin.data.showGarminCoachPlans = true;
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.startsWith('Calendar.md:')));
 assert.equal(calendar.content, edited);
 const standalone = fixture(); standalone.plugin.data.showGarminCoachPlans = true;
 await syncCoachOnlyPlans(standalone.plugin);
 assert.ok(standalone.files.has('Sports/Calendar.md'));
 assert.match(standalone.files.get('Sports/Plans.md').content, /Calendar/);
});
