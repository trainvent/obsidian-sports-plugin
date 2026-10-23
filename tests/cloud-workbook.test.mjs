import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { odsArchive } from './ods-fixtures.mjs';
const temp = mkdtempSync(`${tmpdir()}/sports-cloud-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const result = await build({ stdin: { contents: "export { parseWorkbook } from './src/workbook/parse'; export { cloudWorkbookUrl, readCloudWorkbook } from './src/workbook/cloud'; export { readWorkbookSource } from './src/workbook/source'; export { downloadWorkbook } from './src/workbook/download';", resolveDir: process.cwd() }, bundle: true, format: 'cjs', platform: 'node', write: false, plugins: [{ name: 'platform', setup(builder) {
 builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'stub' }));
 builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const Platform = { isDesktop: true };' }));
} }] });
writeFileSync(`${temp}/cloud.cjs`, result.outputFiles[0].text);
const { parseWorkbook, cloudWorkbookUrl, readCloudWorkbook, readWorkbookSource, downloadWorkbook } = createRequire(import.meta.url)(`${temp}/cloud.cjs`);
const file = readFileSync('templates/Training-example.xlsx');
const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const ok = { status: 200, contentType: 'application/octet-stream', bytes };

test('cloud links normalize Nextcloud file shares while preserving direct links and query tokens', () => {
 assert.equal(cloudWorkbookUrl(' https://cloud.example/nextcloud/index.php/s/abc123/?x=1#preview ').href, 'https://cloud.example/nextcloud/index.php/s/abc123/download?x=1');
 assert.equal(cloudWorkbookUrl('https://cloud.example/s/abc/download').pathname, '/s/abc/download');
 assert.equal(cloudWorkbookUrl('https://cloud.example/Training.xlsx?token=abc').search, '?token=abc');
 for (const input of ['http://cloud.example/s/a', 'file:///tmp/a.xlsx', 'https://user:password@cloud.example/a', 'invalid']) assert.throws(() => cloudWorkbookUrl(input));
});
test('cloud reads are byte-preserving and allow bounded same-origin HTTPS redirects', async () => {
 const urls = [];
 const actual = await readCloudWorkbook('https://cloud.example/s/token', async url => {
  urls.push(url.href);
  return urls.length === 1 ? { status: 302, location: '/files/Training.xlsx', bytes: new ArrayBuffer(0) } : ok;
 });
 assert.deepEqual(new Uint8Array(actual), new Uint8Array(bytes));
 assert.deepEqual(urls, ['https://cloud.example/s/token/download', 'https://cloud.example/files/Training.xlsx']);
});
test('cloud rejects login pages, folders, failed shares, insecure redirects and oversized downloads', async () => {
 for (const reply of [
  { ...ok, contentType: 'text/html' },
  { ...ok, bytes: new TextEncoder().encode('<html>Sign in</html>').buffer },
  { ...ok, status: 403 },
  { ...ok, bytes: new ArrayBuffer(5 * 1024 * 1024 + 1) },
  { status: 302, location: 'http://cloud.example/a.xlsx' },
  { status: 302, location: 'https://other.example/a.xlsx' },
  { status: 302, location: '/loop' },
 ]) await assert.rejects(readCloudWorkbook('https://cloud.example/s/token', async () => reply));
});


test('cloud-only source rejects local paths before any request', async () => {
 for (const path of ['/home/user/Training.xlsx', '~/Sports/Training.xlsx', 'C:\\Training.xlsx', 'Training.xlsx', 'file:///tmp/Training.xlsx', '', 'http://cloud.example/file.xlsx']) {
  await assert.rejects(readWorkbookSource(path), /Local file paths are no longer supported/);
 }
});


test('template download uses a browser blob and disposes the link without selecting a path', async () => {
 const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
 let blob; let revoked; const calls = [];
 URL.createObjectURL = value => { blob = value; return 'blob:template'; };
 URL.revokeObjectURL = value => { revoked = value; };
 try {
  const doc = { body: { createEl(tag, options) {
   assert.equal(tag, 'a'); assert.deepEqual(options.attr, { href: 'blob:template', download: 'Training.xlsx' });
   return { click: () => calls.push('download'), remove: () => calls.push('remove') };
  } } };
  const dispose = downloadWorkbook(bytes, doc);
  assert.deepEqual(calls, ['download', 'remove']);
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array(bytes));
  dispose(); assert.equal(revoked, 'blob:template');
 } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
test('production bundle contains no runtime filesystem access', async () => {
 const output = await build({ entryPoints: ['src/main.ts'], bundle: true, write: false, metafile: true, platform: 'node', format: 'cjs', loader: { '.xlsx': 'binary', '.ods': 'binary', '.md': 'text', '.svg': 'text' }, external: ['obsidian'], plugins: [{ name: 'unused-sdk-imports', setup(builder) {
  builder.onResolve({ filter: /^(?:node:)?fs(?:\/promises)?$/ }, args => ({ path: args.path, external: true, sideEffects: false }));
 } }] });
 const imports = Object.values(output.metafile.outputs).flatMap(file => file.imports);
 assert.deepEqual(imports.filter(item => /^(?:node:)?fs(?:\/|$)/.test(item.path)), []);
 assert.doesNotMatch(output.outputFiles[0].text, /FileTokenStore|require\(["'](?:node:)?fs(?:\/promises)?["']\)/);
});


test('cloud ODS share links import without a filename extension', async () => {
 const bytes = odsArchive([{ sheet: 'Daily', data: [['Date', 'Block', 'Plan'], ['2026-10-26', 'A', 'Practice']] }]);
 const downloaded = await readCloudWorkbook('https://cloud.example/s/token', async () => ({ status: 200, contentType: 'application/vnd.oasis.opendocument.spreadsheet', bytes }));
 const plan = await parseWorkbook(downloaded, { strategySheet: '', trackingSheet: 'Daily', scheduleSheet: '' });
 assert.equal(plan.sessions[0].date, '2026-10-26');
 assert.equal(plan.sessions[0].prescription, 'Practice');
 assert.equal(plan.sessions[0].status, 'planned');
});


test('ODS downloads use the ODS filename and MIME type', async () => {
 const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
 let blob, revoked, clicked = false;
 URL.createObjectURL = value => { blob = value; return 'blob:ods-template'; };
 URL.revokeObjectURL = value => { revoked = value; };
 try {
  const doc = { body: { createEl(tag, options) {
   assert.equal(tag, 'a');
   assert.equal(options.attr.download, 'Training.ods');
   return { click() { clicked = true; }, remove() {} };
  } } };
  const dispose = downloadWorkbook(bytes, doc, 'ods');
  assert.equal(blob.type, 'application/vnd.oasis.opendocument.spreadsheet');
  assert.equal(clicked, true);
  dispose(); assert.equal(revoked, 'blob:ods-template');
 } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
