import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { pathToFileURL } from 'node:url';
const temp = mkdtempSync(`${tmpdir()}/sports-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({ entryPoints: ['src/notes/blocks.ts', 'src/model/calendar.ts', 'src/workbook/parse.ts', 'src/workbook/template.ts', 'src/notes/render.ts'], bundle: true, format: 'esm', platform: 'browser', write: false, outdir: '/tmp/sports-tests' });
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
const { weekMarkdown } = await moduleNamed('render');
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

function mappedWorkbook({ strategyName = 'My goals', trackingName = 'My sessions', removeStrategy = false, removeTracking = false, extra = false } = {}) {
 const files = unzipSync(new Uint8Array(workbook()));
 let info = strFromU8(files['xl/workbook.xml']).replace('name="Strategy"', `name="${strategyName}"`).replace('name="Training log"', `name="${trackingName}"`);
 if (removeStrategy) info = info.replace(/<sheet name="[^"]*" sheetId="1"[^>]*\/>/, '');
 if (removeTracking) info = info.replace(/<sheet name="[^"]*" sheetId="2"[^>]*\/>/, '');
 if (extra) {
  info = info.replace('</sheets>', '<sheet name="Other notes" sheetId="3" r:id="rId3"/></sheets>');
  files['xl/_rels/workbook.xml.rels'] = strToU8(strFromU8(files['xl/_rels/workbook.xml.rels']).replace('</Relationships>', '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/></Relationships>'));
  files['xl/worksheets/sheet3.xml'] = strToU8('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Unstructured personal notes</t></is></c></row></sheetData></worksheet>');
 }
 files['xl/workbook.xml'] = strToU8(info);
 return zipSync(files).buffer;
}
test('custom names and unrelated sheets are supported', async () => {
 const plan = await parseWorkbook(mappedWorkbook({ extra: true }), { strategySheet: 'My goals', trackingSheet: 'My sessions' });
 assert.equal(plan.goals.length, 3);
 assert.equal(plan.sessions.length, 1);
});
test('strategy and tracking can each be used independently', async () => {
 const strategy = await parseWorkbook(mappedWorkbook({ removeTracking: true }), { strategySheet: 'My goals', trackingSheet: '' });
 assert.equal(strategy.sessions.length, 0);
 assert.equal(strategy.parts.length, 2);
 const tracking = await parseWorkbook(mappedWorkbook({ removeStrategy: true }), { strategySheet: '', trackingSheet: 'My sessions' });
 assert.equal(tracking.goals.length, 0);
 assert.equal(tracking.sessions.length, 1);
 assert.equal(tracking.sessions[0].partId, 'a');
 const preserved = await parseWorkbook(mappedWorkbook({ removeStrategy: true }), { strategySheet: '', trackingSheet: 'My sessions', previous: strategy });
 assert.deepEqual(preserved.parts, strategy.parts);
 const preservedTracking = await parseWorkbook(mappedWorkbook({ removeTracking: true }), { strategySheet: 'My goals', trackingSheet: '', previous: preserved });
 assert.deepEqual(preservedTracking.sessions, preserved.sessions);
});
test('missing selected sheets and duplicate role selections fail explicitly', async () => {
 await assert.rejects(parseWorkbook(workbook(), { strategySheet: 'Missing', trackingSheet: '' }), /was not found/);
 await assert.rejects(parseWorkbook(workbook(), { strategySheet: '', trackingSheet: '' }), /at least one/);
 await assert.rejects(parseWorkbook(workbook(), { strategySheet: 'Strategy', trackingSheet: 'Strategy' }), /different sheets/);
});
test('offered daily template imports dates and separate results without inventing measurements', async () => {
 const saved = readFileSync('templates/Sports-template.xlsx');
 const buffer = saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength);
 const original = new Uint8Array(buffer).slice();
 const plan = await parseWorkbook(buffer);
 assert.equal(plan.goals.length, 3);
 assert.equal(plan.parts.length, 4);
 const core = plan.parts.find(part => part.id === 'Core');
 assert.ok(core.prescription.includes('30 sec work + 20 sec rest'));
 assert.ok(core.prescription.includes('weighted squats'));
 assert.ok(core.title.includes('16 min 40 sec'));
 assert.equal(plan.sessions.length, 7);
 assert.equal(plan.sessions[0].date, '2026-10-19');
 assert.equal(plan.sessions[0].plannedMinutes, null);
 assert.equal(plan.sessions[0].actualMinutes, null);
 assert.equal(plan.sessions[0].checks['Core done'], false);
 assert.equal(plan.sessions[0].results['Muscle-up result'], '');
 assert.equal(plan.sessions[0].partId, 'A');
 assert.equal(plan.sessions[0].status, 'planned');
 assert.deepEqual(new Uint8Array(buffer), original);
});
function dailyWorkbook({ core = true, result = '3 x 5 assisted', duplicate = false } = {}) {
 const files = unzipSync(new Uint8Array(workbook()));
 const data = [['Date','Block','Plan','Core done','Muscle-up result','HSPU result','Pistol result','Notes'],['2026-10-20','a','Skills and core',core,result,'','','Keep these notes']];
 if (duplicate) data.push(data[1]);
 const xml = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data.map((row,r) => `<row r="${r+1}">${row.map((value,c) => typeof value === 'boolean' ? `<c r="${String.fromCharCode(65+c)}${r+1}" t="b"><v>${value ? 1 : 0}</v></c>` : `<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t>${value}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
 files['xl/worksheets/sheet2.xml'] = strToU8(xml);
 return zipSync(files).buffer;
}
test('daily results and core checkbox remain separate from whole-session completion', async () => {
 const plan = await parseWorkbook(dailyWorkbook());
 const session = plan.sessions[0];
 assert.equal(session.status, 'in-progress');
 assert.equal(session.checks['Core done'], true);
 assert.equal(session.results['Muscle-up result'], '3 x 5 assisted');
 assert.equal(session.results['HSPU result'], '');
 assert.equal(session.prescription, 'Skills and core');
 assert.equal(session.notes, 'Keep these notes');
 assert.equal(session.plannedMinutes, null);
 const markdown = weekMarkdown(plan, [], [session.date]);
 assert.ok(markdown.includes('Skills and core'));
 assert.ok(markdown.includes('Muscle-up result: 3 x 5 assisted'));
 assert.ok(markdown.includes('Core done: yes'));
 assert.ok(markdown.includes('Keep these notes'));
 assert.ok(markdown.includes('in-progress'));
 const unchecked = await parseWorkbook(dailyWorkbook({ core: false, result: '' }));
 assert.equal(unchecked.sessions[0].status, 'planned');
 assert.equal(unchecked.sessions[0].id, session.id);
 await assert.rejects(parseWorkbook(dailyWorkbook({ duplicate: true })), /duplicate IDs/);
 await assert.rejects(parseWorkbook(dailyWorkbook({ core: 'yes' })), /TRUE, FALSE/);
});

test('strategy weekly schedule creates planned activities without daily result rows', async () => {
 const files = unzipSync(new Uint8Array(workbook()));
 const rows = [['Weekly schedule'], ['Day','Time','Minutes','Activity','Recorded by','Notes'], ['Monday','18:00','60','Swim course','Garmin','Coached session'], ['Tuesday','','','','','']];
 const xml = rows.map((row,r) => `<row r="${100+r}">${row.map((value,c) => `<c r="${String.fromCharCode(65+c)}${100+r}" t="inlineStr"><is><t>${value}</t></is></c>`).join('')}</row>`).join('');
 files['xl/worksheets/sheet1.xml'] = strToU8(strFromU8(files['xl/worksheets/sheet1.xml']).replace('</sheetData>', `${xml}</sheetData>`));
 const plan = await parseWorkbook(zipSync(files).buffer);
 assert.equal(plan.weeklySchedule.length, 1);
 assert.equal(plan.sessions.length, 1);
 assert.equal(plan.weeklySchedule[0].recordedBy, 'Garmin');
 assert.equal(plan.weeklySchedule[0].minutes, 60);
 const markdown = weekMarkdown(plan, [], ['2026-10-19']);
 assert.ok(markdown.includes('Swim course'));
 assert.ok(markdown.includes('Planned'));
 assert.ok(markdown.includes('Garmin'));
 assert.ok(!markdown.includes('completed'));
 const preserved = await parseWorkbook(mappedWorkbook({ removeStrategy: true }), { strategySheet: '', trackingSheet: 'My sessions', previous: plan });
 assert.deepEqual(preserved.weeklySchedule, plan.weeklySchedule);
});
