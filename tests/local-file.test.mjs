import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, writeFile, rm, open } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const temp = await mkdtemp(join(tmpdir(), 'sports-local-file-'));
const platform = { isDesktop: true };
global.__sportsTestPlatform = platform;
const result = await build({ entryPoints: ['src/workbook/local-file.ts'], bundle: true, platform: 'browser', format: 'cjs', external: ['os', 'path', 'fs'], metafile: true, write: false, plugins: [{ name: 'obsidian-platform-stub', setup(builder) {
 builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test-platform' }));
 builder.onLoad({ filter: /.*/, namespace: 'test-platform' }, () => ({ contents: 'export const Platform = globalThis.__sportsTestPlatform;' }));
} }] });
const modulePath = join(temp, 'local-file.cjs');
await writeFile(modulePath, result.outputFiles[0].text);
const { workbookLocation, readLocalWorkbook, createLocalTemplate } = createRequire(import.meta.url)(modulePath);

test('desktop source bundle uses CommonJS instead of browser dynamic imports', () => {
 const imports = Object.values(result.metafile.outputs).flatMap(output => output.imports);
 assert.ok(imports.some(item => item.path === 'os' && item.kind === 'require-call'));
 assert.ok(imports.some(item => item.path === 'fs' && item.kind === 'require-call'));
 assert.ok(!imports.some(item => item.kind === 'dynamic-import'));
});

test('local source reads one configured external file without changing its bytes', async () => {
 const file = join(temp, 'Training.xlsx');
 const original = await readFile('templates/Sports-template.xlsx');
 await writeFile(file, original);
 const read = await readLocalWorkbook(file);
 assert.deepEqual(new Uint8Array(read), new Uint8Array(original));
 assert.deepEqual(await readFile(file), original);
});
test('template creation refuses to overwrite an existing workbook', async () => {
 const file = join(temp, 'new-folder', 'Training.xlsx');
 const original = await readFile('templates/Sports-template.xlsx');
 const bytes = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
 await createLocalTemplate(file, bytes);
 await assert.rejects(createLocalTemplate(file, new Uint8Array([4]).buffer), { code: 'EEXIST' });
 assert.deepEqual(await readFile(file), original);
 assert.deepEqual(new Uint8Array(await readLocalWorkbook(file)), new Uint8Array(original));
});
test('paths support home expansion and reject old vault-relative sources', async () => {
 assert.equal(await workbookLocation('~/Documents/Sports/Training.xlsx'), join(homedir(), 'Documents', 'Sports', 'Training.xlsx'));
 await assert.rejects(workbookLocation('Sports/Training.xlsx'), /absolute workbook path/);
 await assert.rejects(workbookLocation(join(temp, 'Training.txt')), /ending in .xlsx/);
 await assert.rejects(readLocalWorkbook(join(temp, 'missing.xlsx')), { code: 'ENOENT' });
});
test('oversized sources are rejected before reading workbook data', async () => {
 const file = join(temp, 'oversized.xlsx');
 const handle = await open(file, 'w');
 await handle.truncate(5 * 1024 * 1024 + 1); await handle.close();
 await assert.rejects(readLocalWorkbook(file), /5 MB/);
});
test('mobile rejects desktop actions while leaving source files untouched', async () => {
 platform.isDesktop = false;
 try {
  await assert.rejects(readLocalWorkbook(join(temp, 'Training.xlsx')), /desktop/);
  await assert.rejects(createLocalTemplate(join(temp, 'mobile.xlsx'), new ArrayBuffer(1)), /desktop/);
 } finally { platform.isDesktop = true; }
});
after(async () => { await rm(temp, { recursive: true, force: true }); });
