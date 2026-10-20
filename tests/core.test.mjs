import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const temp = mkdtempSync(`${tmpdir()}/sports-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({ entryPoints: ['src/notes/blocks.ts', 'src/model/calendar.ts', 'src/workbook/parse.ts', 'src/workbook/template.ts'], bundle: true, format: 'esm', platform: 'browser', write: false, outdir: '/tmp/sports-tests' });
async function moduleNamed(name) {
 const text = output.outputFiles.find(file => file.path.endsWith(`/${name}.js`)).text;
 const path = `${temp}/${name}.mjs`; writeFileSync(path, text);
 // Only the temporary file containing our own esbuild output is imported.
 // eslint-disable-next-line no-unsanitized/method -- Imports only our own build output from a private temporary directory.
 return import(pathToFileURL(path).href);
}
const { mergeBlock, generatedBlock } = await moduleNamed('blocks');
const { weekDates, eventsOn } = await moduleNamed('calendar');
const { parseWorkbook } = await moduleNamed('parse');
const { exampleWorkbook: workbook } = await moduleNamed('template');
test('refresh preserves reflections and detects edits or missing markers', () => {
 const previous = generatedBlock('week:2026-10-19', 'Old overview');
 const note = `# Weekly note\n\n${previous}\n\n## Reflections\nPersonal notes: ä / **keep**\n`;
 const updated = mergeBlock(note, 'week:2026-10-19', 'New overview', previous);
 assert.ok(updated.endsWith('## Reflections\nPersonal notes: ä / **keep**\n'));
 assert.throws(() => mergeBlock(note.replace('Old overview', 'My edit'), 'week:2026-10-19', 'New', previous), /edited/);
 assert.throws(() => mergeBlock('No markers', 'week:2026-10-19', 'New', previous), /removed/);
 assert.equal(mergeBlock(updated, 'week:2026-10-19', 'New overview', generatedBlock('week:2026-10-19', 'New overview')), updated);
});
test('calendar crosses year boundaries and respects recurrence bounds', () => {
 assert.deepEqual(weekDates(new Date(2027, 0, 1, 12)), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 const event = { weekday: 1, startDate: '2026-10-19', endDate: '2026-10-26' };
 assert.equal(eventsOn([event], '2026-10-19').length, 1);
 assert.equal(eventsOn([event], '2026-10-20').length, 0);
 assert.equal(eventsOn([event], '2026-11-02').length, 0);
});
test('workbook rejects invalid input and oversized archives before parsing', async () => {
 await assert.rejects(parseWorkbook(new ArrayBuffer(30)), /Invalid workbook/);
 await assert.rejects(parseWorkbook(new ArrayBuffer(5 * 1024 * 1024 + 1)), /5 MB/);
});

test('two-sheet workbook resolves goals and parts without inventing actual results', async () => {
 const plan = await parseWorkbook(workbook());
 assert.deepEqual(plan.parts[0].goalIds, ['g1', 'g3']);
 assert.equal(plan.sessions[0].plannedMinutes, 40);
 assert.equal(plan.sessions[0].actualMinutes, null);
 assert.equal(plan.sessions[0].status, 'planned');
 await assert.rejects(parseWorkbook(workbook({ badLink: true })), /unknown goal/);
 await assert.rejects(parseWorkbook(workbook({ duplicate: true })), /duplicate IDs/);
});
