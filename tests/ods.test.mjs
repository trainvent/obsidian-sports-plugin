import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { strToU8, zipSync, unzipSync } from 'fflate';
import { odsArchive, odsDocument, odsCell } from './ods-fixtures.mjs';
const temp = mkdtempSync(`${tmpdir()}/sports-ods-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({ stdin: { contents: "export { templateWorkbook } from './src/workbook/template-file'; export { parseWorkbook } from './src/workbook/parse'; export { readWorkbookSheets } from './src/workbook/read-sheets'; export { readOds } from './src/workbook/ods';", resolveDir: process.cwd() }, bundle: true, format: 'cjs', platform: 'node', write: false, loader: { '.xlsx': 'binary', '.ods': 'binary' } });
writeFileSync(`${temp}/ods.cjs`, output.outputFiles[0].text);
const { templateWorkbook, parseWorkbook, readWorkbookSheets, readOds } = createRequire(import.meta.url)(`${temp}/ods.cjs`);
const mapping = { strategySheet: '', trackingSheet: 'Daily', scheduleSheet: '' };
const raw = xml => ({ xml });
const date = raw('<table:table-cell office:value-type="date" office:date-value="2026-10-26"/>');
const time = value => raw(`<table:table-cell office:value-type="time" office:time-value="${value}"/>`);
const formula = (type, attr, value) => raw(`<table:table-cell table:formula="of:=1+1" office:value-type="${type}" office:${attr}="${value}"/>`);
const simple = data => [{ sheet: 'Daily', data }];
const withoutStamp = plan => { const { importedAt, ...rest } = plan; assert.ok(importedAt); return rest; };

test('ODS and XLSX template imports yield the same complete training model', async () => {
 const bytes = readFileSync('templates/Training-example.xlsx');
 const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
 const selected = new Set(['Strategy', 'Daily', 'Recurring']);
 const sheets = await readWorkbookSheets(buffer, selected);
 const config = { strategySheet: 'Strategy', trackingSheet: 'Daily', scheduleSheet: 'Recurring' };
 const xlsx = await parseWorkbook(buffer, config);
 const ods = await parseWorkbook(odsArchive(sheets), config);
 assert.deepEqual(withoutStamp(ods), withoutStamp(xlsx));
 assert.equal(ods.sessions.length, 48);
});

test('ODS grouped Daily preserves FALSE, blank, zero, All done and saved score formulas', async () => {
 const data = [
  ['', '', '', 'Squat', null, null],
  ['Date', 'Block', 'Plan', 'Done', '1', '2', 'All done', 'Planned intensity', 'Actual performance', 'Effort rating'],
  [date, 'A', 'Squat) Squat: 2 x 5', false, 5, 5, false, formula('float', 'value', 4), null, null],
  ['2026-10-27', 'A', 'Squat) Squat: 2 x 5', null, 0, 5, true, 6, 0, 3],
  ['2026-10-28', 'A', 'Squat) Squat: 2 x 5', true, 0, null, null, 0, null, null],
 ];
 const { sessions } = await parseWorkbook(odsArchive(simple(data)), mapping);
 assert.equal(sessions[0].status, 'planned');
 assert.equal(sessions[0].checks['Squat done'], false);
 assert.equal(sessions[0].results['Squat 1 result'], '');
 assert.equal(sessions[0].scores.plannedIntensity, 4);
 assert.equal(sessions[1].checks['Squat done'], true);
 assert.equal(sessions[1].results['Squat 1 result'], '0');
 assert.equal(sessions[1].scores.actualPerformance, 0);
 assert.equal(sessions[2].results['Squat 1 result'], '0');
 assert.equal(sessions[2].results['Squat 2 result'], '');
});

test('ODS timed sets and recurring clock cells retain duration semantics', async () => {
 const daily = { sheet: 'Daily', data: [
  ['Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Done'],
  [date, 'Hold', 1, 'seconds', time('PT1M30S'), time('PT0S'), true],
  [date, 'Hold', 2, 'seconds', time('PT1H'), time('P1DT1H'), false],
 ] };
 const recurring = { sheet: 'Recurring', data: [['Weekly schedule'], ['Day', 'Time Start', 'Time End', 'Activity'], ['Monday', time('PT18H'), time('PT19H30M'), 'Swim']] };
 const plan = await parseWorkbook(odsArchive([daily, recurring]), { ...mapping, scheduleSheet: 'Recurring' });
 assert.deepEqual(plan.sessions[0].tracking[0].targets, [90, 3600]);
 assert.deepEqual(plan.sessions[0].tracking[0].actual, [0, null]);
 assert.equal(plan.weeklySchedule[0].time, '18:00');
 assert.equal(plan.weeklySchedule[0].minutes, 90);
});

test('ODS preserves merged header positions, rich text and repeated cells/rows without expanding trailing blanks', () => {
 const rows = '<table:table-row><table:table-cell table:number-columns-spanned="2" office:value-type="string"><text:p>A</text:p></table:table-cell><table:covered-table-cell/></table:table-row>' +
  '<table:table-row table:number-rows-repeated="2"><table:table-cell table:number-columns-repeated="2" office:value-type="boolean" office:boolean-value="false"/></table:table-row>' +
  '<table:table-row table:number-rows-repeated="3"><table:table-cell/></table:table-row>' +
  '<table:table-row><table:table-cell office:value-type="string"><text:p>Hello<text:s text:c="2"/><text:span>world &amp; friends</text:span><text:line-break/>Line 2</text:p><text:p>Paragraph 2</text:p><office:annotation><text:p>Not cell content</text:p></office:annotation></table:table-cell><table:table-cell table:number-columns-repeated="16383"/></table:table-row>' +
  '<table:table-row table:number-rows-repeated="1048570"><table:table-cell/></table:table-row>';
 const [sheet] = readOds(odsDocument([{ sheet: 'Data', rows }]), new Set(['Data']));
 assert.deepEqual(sheet.data[0], ['A']);
 assert.deepEqual(sheet.data[1], [false, false]);
 assert.deepEqual(sheet.data[2], [false, false]);
 assert.deepEqual(sheet.data.slice(3, 6), [[], [], []]);
 assert.equal(sheet.data.length, 7);
 assert.equal(sheet.data[6][0], 'Hello  world & friends\nLine 2\nParagraph 2');
});

test('ODS uses namespace URIs and ignores unsupported values on unselected sheets', async () => {
 const sheets = simple([['Date', 'Block', 'Plan'], [date, 'A', 'Practice']]);
 sheets.push({ sheet: 'Unrelated', rows: '<table:table-row><table:table-cell table:formula="of:=1+1"/></table:table-row>' });
 const xml = odsDocument(sheets).replaceAll('<table:', '<t:').replaceAll('</table:', '</t:').replaceAll(' table:', ' t:').replace('xmlns:table=', 'xmlns:t=');
 assert.equal(readOds(xml, new Set(['Daily']))[0].data[1][0].toISOString().slice(0, 10), '2026-10-26');
 assert.equal((await parseWorkbook(odsArchive(sheets), mapping)).sessions.length, 1);
 await assert.rejects(parseWorkbook(odsArchive(sheets), { ...mapping, trackingSheet: 'Missing' }), /Available sheets: "Daily", "Unrelated"/);
});

test('ODS requires usable saved formula results rather than treating missing values as zero', async () => {
 for (const cell of [raw('<table:table-cell table:formula="of:=1+1"/>'), raw('<table:table-cell office:value-type="float"/>'), raw('<table:table-cell table:formula="of:=1/0" office:value-type="string"><text:p>#DIV/0!</text:p></table:table-cell>')]) {
  await assert.rejects(parseWorkbook(odsArchive(simple([['Date', 'Block', 'Plan', 'Planned intensity'], [date, 'A', 'Practice', cell]])), mapping), /Recalculate and save/);
 }
});

test('ODS rejects invalid XML, unsupported archives, encrypted data, and oversized expansion', async () => {
 const xml = odsDocument([{ sheet: 'Daily', data: [['Test']] }]);
 for (const malformed of [xml.slice(0, -20), xml.replace('</text:p>', '</wrong>'), '<!DOCTYPE x><office:document-content/>']) assert.throws(() => readOds(malformed, new Set(['Daily'])));
 for (const attrs of ['table:number-columns-repeated="16385"', 'table:number-columns-repeated="-1"']) assert.throws(() => readOds(odsDocument([{ sheet: 'Daily', rows: `<table:table-row><table:table-cell ${attrs}/></table:table-row>` }]), new Set(['Daily'])), /limit/);
 const huge = `<table:table-row table:number-rows-repeated="100000">${odsCell('A')}${odsCell('B')}${odsCell('C')}${odsCell('D')}${odsCell('E')}${odsCell('F')}${odsCell('G')}${odsCell('H')}${odsCell('I')}${odsCell('J')}${odsCell('K')}</table:table-row>`;
 assert.throws(() => readOds(odsDocument([{ sheet: 'Daily', rows: huge }]), new Set(['Daily'])), /limit/);
 const encrypted = odsArchive(simple([['Test']]), { 'META-INF/manifest.xml': strToU8('<manifest:encryption-data/>') });
 await assert.rejects(readWorkbookSheets(encrypted, new Set(['Daily'])), /Password-protected/);
 const unsupported = zipSync({ 'content.xml': strToU8(xml) });
 await assert.rejects(readWorkbookSheets(unsupported.buffer, new Set(['Daily'])), /Unsupported workbook format/);
});


test('both downloadable templates start next Monday and import identical plans across year/DST boundaries', async () => {
 const config = { strategySheet: 'Strategy', trackingSheet: 'Daily', scheduleSheet: 'Recurring' };
 for (const now of [new Date(2026, 11, 31, 12), new Date(2027, 2, 27, 12), new Date(2027, 9, 30, 12), new Date(2026, 9, 26, 12)]) {
  const xlsx = await parseWorkbook(templateWorkbook(now, 'xlsx'), config);
  const odsBytes = templateWorkbook(now, 'ods');
  const ods = await parseWorkbook(odsBytes, config);
  assert.deepEqual(withoutStamp(ods), withoutStamp(xlsx));
  assert.equal(ods.sessions.length, 48);
  assert.equal(ods.weekPlans.length, 12);
  assert.ok(ods.sessions.every(session => session.scores.actualPerformance === null));
  const start = new Date(`${ods.sessions[0].date}T12:00:00`);
  assert.equal(start.getDay(), 1);
  assert.ok(start > now);
  assert.deepEqual(unzipSync(new Uint8Array(templateWorkbook(now, 'ods'))), unzipSync(new Uint8Array(odsBytes)));
  assert.equal(new DataView(odsBytes).getUint16(8, true), 0);
 }
});

test('native Calc empty formula paragraphs stay missing rather than becoming zero', async () => {
 const blank = raw('<table:table-cell table:formula="of:=IF(FALSE();1;&quot;&quot;)"><text:p/></table:table-cell>');
 const data = [['Date', 'Block', 'Plan', 'Actual performance'], [date, 'A', 'Practice', blank]];
 const plan = await parseWorkbook(odsArchive(simple(data)), mapping);
 assert.equal(plan.sessions[0].status, 'planned');
 assert.equal(plan.sessions[0].scores, undefined);
});
