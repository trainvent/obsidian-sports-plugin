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
  app: { vault: {
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
 for (const path of ['Sports/Plan.md', 'Sports/complete-log.md', 'Sports/Strategy.md', 'Sports/Weeks/2026-12-28.md']) assert.ok(files.get(path) instanceof TFile, path);
 assert.ok(files.get('Sports/Plan.md').content.includes('[[Sports/Weeks/2026-12-28\\|2026-12-28]]'));
 assert.ok(files.get('Sports/Weeks/2026-12-28.md').content.includes('Record baseline'));
 const log = files.get('Sports/complete-log.md');
 log.content += '\nPersonal reflection\n';
 const original = log.content;
 assert.deepEqual(await syncNotes(plugin, plan), []);
 assert.equal(log.content, original);
});

test('a protected-note conflict does not prevent other weeks from being created', async () => {
 const { plugin, plan, files } = fixture();
 await syncNotes(plugin, plan);
 const log = files.get('Sports/complete-log.md');
 log.content = log.content.replace('No training log entries', 'My own generated-section edit');
 const edited = log.content;
 plan.weekPlans.push({ ...plan.weekPlans[0], week: 2, start: '2027-01-04' });
 const issues = await syncNotes(plugin, plan);
 assert.equal(issues.length, 1);
 assert.match(issues[0], /complete-log.md.*edited/);
 assert.equal(log.content, edited);
 assert.ok(files.has('Sports/Weeks/2027-01-04.md'));
 files.delete('Sports/Weeks/2027-01-04.md');
 assert.ok((await syncNotes(plugin, plan)).some(issue => issue.includes('removed')));
 assert.ok(!files.has('Sports/Weeks/2027-01-04.md'));
});
