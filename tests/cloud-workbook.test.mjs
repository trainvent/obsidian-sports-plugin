import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-cloud-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const result = await build({ entryPoints: ['src/workbook/cloud.ts'], bundle: true, format: 'cjs', platform: 'node', write: false, plugins: [{ name: 'platform', setup(builder) {
 builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'stub' }));
 builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const Platform = { isDesktop: true };' }));
} }] });
writeFileSync(`${temp}/cloud.cjs`, result.outputFiles[0].text);
const { cloudWorkbookUrl, readCloudWorkbook } = createRequire(import.meta.url)(`${temp}/cloud.cjs`);
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
