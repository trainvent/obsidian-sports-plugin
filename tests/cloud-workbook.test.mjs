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
const file = readFileSync('templates/Training-Example.xlsx');
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
   assert.equal(tag, 'a'); assert.deepEqual(options.attr, { href: 'blob:template', download: 'Training-Example.xlsx' });
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
   assert.equal(options.attr.download, 'Training-Example.ods');
   return { click() { clicked = true; }, remove() {} };
  } } };
  const dispose = downloadWorkbook(bytes, doc, 'ods');
  assert.equal(blob.type, 'application/vnd.oasis.opendocument.spreadsheet');
  assert.equal(clicked, true);
  dispose(); assert.equal(revoked, 'blob:ods-template');
 } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});

test('blank workbook downloads use a distinct template filename', () => {
 const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
 URL.createObjectURL = () => 'blob:blank'; URL.revokeObjectURL = () => {};
 try {
  for (const format of ['xlsx','ods']) {
   const doc = {body:{createEl:(_tag, options)=>{
    assert.equal(options.attr.download, `Training-Template.${format}`);
    return {click(){},remove(){}};
   }}};
   downloadWorkbook(new ArrayBuffer(0), doc, format, 'blank')();
  }
 } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});

async function compile(dev) {
 const result = await build({ stdin: { contents: "export { readWorkbookSource } from './src/workbook/source';" + (dev ? "export { setLocalWorkbook, hasLocalWorkbook } from './src/dev/local-workbook';" : ''), resolveDir: process.cwd() }, define: { __SPORTS_DEV__: String(dev) }, bundle: true, platform: 'node', format: 'cjs', write: false, metafile: true, plugins: [{ name: 'obsidian', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'stub' }));
  builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export class Modal {} export class Notice {} export class Setting {} export const Platform = {isDesktop: true};' }));
 } }] });
 const file = `${temp}/${dev ? 'dev' : 'production'}.cjs`;
 writeFileSync(file, result.outputFiles[0].text);
 return { api: createRequire(import.meta.url)(file), result };
}
const dev = await compile(true);
const prod = await compile(false);

test('development override reads current vault bytes without touching the cloud or workbook', async () => {
 let bytes = new Uint8Array([80, 75, 3, 4]).buffer;
 const paths = [];
 const adapter = { async readBinary(path) { paths.push(path); return bytes; } };
 dev.api.setLocalWorkbook(adapter, 'Agent-Plan-Test/Resistance-Band-Plan.xlsx');
 assert.equal(await dev.api.readWorkbookSource('invalid cloud link', adapter), bytes);
 bytes = new Uint8Array([80, 75, 3, 4, 5]).buffer;
 assert.equal(await dev.api.readWorkbookSource('', adapter), bytes);
 assert.deepEqual(paths, Array(2).fill('Agent-Plan-Test/Resistance-Band-Plan.xlsx'));
 const other = { async readBinary() { throw new Error('Wrong vault'); } };
 assert.equal(dev.api.hasLocalWorkbook(other), false);
 dev.api.setLocalWorkbook(adapter, '');
 assert.equal(dev.api.hasLocalWorkbook(adapter), false);
 await assert.rejects(dev.api.readWorkbookSource('local.xlsx', adapter), /HTTPS/);
});

test('development paths stay in the vault and local read failures stay visible', async () => {
 const adapter = { async readBinary() { throw new Error('Missing debug workbook'); } };
 for (const path of ['/tmp/test.xlsx', '../test.xlsx', 'a/../test.xlsx', '.hidden/test.xlsx', 'C:\\test.xlsx', 'file:test.xlsx', 'folder//test.xlsx', 'test.txt']) assert.throws(() => dev.api.setLocalWorkbook(adapter, path));
 dev.api.setLocalWorkbook(adapter, 'test.ods');
 await assert.rejects(dev.api.readWorkbookSource('https://unused.invalid', adapter), /Missing debug workbook/);
 const oversized = { async readBinary() { return new ArrayBuffer(5 * 1024 * 1024 + 1); } };
 dev.api.setLocalWorkbook(oversized, 'large.xlsx');
 await assert.rejects(dev.api.readWorkbookSource('', oversized), /5 MB/);
});

test('production source eliminates the override module and rejects local paths without reading them', async () => {
 assert.ok(!Object.keys(prod.result.metafile.inputs).some(path => path.includes('/dev/')));
 assert.ok(!prod.result.outputFiles[0].text.includes('dev-local-workbook'));
 let reads = 0;
 const adapter = { async readBinary() { reads++; return new ArrayBuffer(0); } };
 dev.api.setLocalWorkbook(adapter, 'test.xlsx');
 await assert.rejects(prod.api.readWorkbookSource('test.xlsx', adapter), /HTTPS/);
 assert.equal(reads, 0);
});
