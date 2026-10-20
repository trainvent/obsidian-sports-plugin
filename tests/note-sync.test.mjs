import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const temp = mkdtempSync(`${tmpdir()}/sports-note-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({
 entryPoints: ['src/notes/sync.ts'], bundle: true, format: 'esm', platform: 'browser', write: false,
 plugins: [{ name: 'obsidian-test-vault', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
  builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export class TFile { constructor(path) { this.path = path; } } export const normalizePath = path => path;' }));
 } }],
});
writeFileSync(`${temp}/sync.mjs`, output.outputFiles[0].text + '\nexport { TFile };');
// eslint-disable-next-line no-unsanitized/method -- Imports our own esbuild output from a private temporary directory.
const { syncNotes, TFile } = await import(pathToFileURL(`${temp}/sync.mjs`).href);

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
 log.content = log.content.replace('No training log entries', 'My own generated-section edit');
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
