import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
// Large XLSX sheets use fflate workers; the Node test runner needs its Node implementation.
const output = await build({ entryPoints: ['src/notes/blocks.ts', 'src/model/calendar.ts', 'src/workbook/parse.ts', 'src/workbook/template.ts', 'src/notes/render.ts', 'src/notes/plan.ts', 'src/workbook/template-dates.ts'], bundle: true, format: 'cjs', platform: 'node', write: false, outdir: '/tmp/sports-tests' });
const require = createRequire(import.meta.url);
async function moduleNamed(name) {
 const text = output.outputFiles.find(file => file.path.endsWith(`/${name}.js`)).text;
 const path = `${temp}/${name}.cjs`; writeFileSync(path, text);
 // Only the temporary file containing our own esbuild output is imported.
 return require(path);
}
const { mergeBlock, generatedBlock } = await moduleNamed('blocks');
const { weekDates, scheduleOn } = await moduleNamed('calendar');
const { parseWorkbook } = await moduleNamed('parse');
const { startTemplateNextMonday } = await moduleNamed('template-dates');
const { plannedWeeks, planMarkdown, weeklyStrategy } = await moduleNamed('plan');
const { weekMarkdown, trainingLogMarkdown, strategyMarkdown, datedLogMarkdown } = await moduleNamed('render');
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
test('calendar crosses year boundaries', () => {
 assert.deepEqual(weekDates(new Date(2027, 0, 1, 12)), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);

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
 let info = strFromU8(files['xl/workbook.xml']).replace('name="Strategy"', `name="${strategyName}"`).replace('name="Daily"', `name="${trackingName}"`);
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
test('missing sheet errors identify the setting and list available workbook tabs', async () => {
 for (const [field, label] of [['strategySheet', 'Strategy sheet'], ['trackingSheet', 'Tracking sheet'], ['scheduleSheet', 'Weekly schedule sheet']]) {
  const mapping = { strategySheet: '', trackingSheet: '', scheduleSheet: '', [field]: 'Old tab' };
  await assert.rejects(parseWorkbook(workbook(), mapping), error => {
   assert.ok(error.message.startsWith(`${label} "Old tab" was not found.`));
   assert.ok(error.message.includes('Available sheets: "Strategy", "Daily".'));
   assert.ok(error.message.includes('select Sync now'));
   assert.ok(error.message.includes('Previously imported data is retained'));
   return true;
  });
 }
});
test('offered daily template imports dates and separate results without inventing measurements', async () => {
 const saved = readFileSync('templates/Sports-template.xlsx');
 const buffer = saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength);
 const original = new Uint8Array(buffer).slice();
 const plan = await parseWorkbook(buffer, { strategySheet: 'Strategy', trackingSheet: 'Training log' });
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
function dailyWorkbook({ core = true, result = '3 x 5 assisted', duplicate = false, rows } = {}) {
 const files = unzipSync(new Uint8Array(workbook()));
 const data = rows ?? [['Date','Block','Plan','Core done','Muscle-up result','HSPU result','Pistol result','Notes'],['2026-10-20','a','Skills and core',core,result,'','','Keep these notes']];
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
 const markdown = weekMarkdown(plan, [session.date]);
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
 const explicit = await parseWorkbook(zipSync(files).buffer, { strategySheet: 'Strategy', trackingSheet: 'Daily', scheduleSheet: 'Strategy' });
 assert.deepEqual(explicit.weeklySchedule, plan.weeklySchedule);
 const markdown = weekMarkdown(plan, ['2026-10-19'], true);
 assert.ok(markdown.includes('Swim course'));
 assert.ok(markdown.includes('Planned'));
 assert.ok(markdown.includes('Garmin'));
 assert.ok(!markdown.includes('completed'));
 const preserved = await parseWorkbook(mappedWorkbook({ removeStrategy: true }), { strategySheet: '', trackingSheet: 'My sessions', previous: plan });
 assert.deepEqual(preserved.weeklySchedule, plan.weeklySchedule);
});

test('training log shows the full second-sheet schedule and daily results', async () => {
 const plan = await parseWorkbook(dailyWorkbook());
 plan.sessions.push({ ...plan.sessions[0], id: 'earlier', date: '2025-01-01', notes: 'Earlier | entry' });
 const original = plan.sessions.map(session => session.id);
 const markdown = trainingLogMarkdown(plan);
 assert.ok(markdown.indexOf('2025-01-01') < markdown.indexOf('2026-10-20'));
 for (const value of ['Skills and core', 'Core done: yes', 'Muscle-up result: 3 x 5 assisted', 'Keep these notes', 'in-progress', 'Earlier \\| entry']) assert.ok(markdown.includes(value), value);
 assert.deepEqual(plan.sessions.map(session => session.id), original);
 assert.ok(trainingLogMarkdown(null).includes('No training log entries'));
 const legacy = await parseWorkbook(workbook());
 assert.ok(trainingLogMarkdown(legacy).includes(legacy.parts[0].prescription));
});

function withWeekPlans(rows) {
 const files = unzipSync(new Uint8Array(workbook()));
 const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
 const data = [['Week plans'], ['Week','Start','Phase','Focus','Targets','Advance when','Minutes'], ...rows];
 const xml = data.map((row, r) => `<row r="${100+r}">${row.map((value,c) => `<c r="${String.fromCharCode(65+c)}${100+r}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('');
 files['xl/worksheets/sheet1.xml'] = strToU8(strFromU8(files['xl/worksheets/sheet1.xml']).replace('</sheetData>', `${xml}</sheetData>`));
 return zipSync(files).buffer;
}
test('explicit weekly plans create future weeks and show strategy without claiming results', async () => {
 const row = ['1','2026-12-28','Foundation','Establish starting level','Record controlled variation','Review then progress','120'];
 const plan = await parseWorkbook(withWeekPlans([row]));
 const dates = plannedWeeks(plan, new Date(2026, 9, 20, 12));
 assert.ok(dates.includes('2026-10-19'));
 assert.ok(dates.includes('2026-12-28'));
 assert.equal(new Set(dates).size, dates.length);
 const markdown = weekMarkdown(plan, ['2026-12-28']);
 assert.ok(markdown.includes('Establish starting level'));
 assert.ok(!markdown.includes('Advance when'));
 assert.ok(!markdown.includes('Review then progress'));
 assert.ok(markdown.includes('120 min'));
 assert.ok(!markdown.includes('completed'));
 assert.ok(planMarkdown(plan, 'Sports', dates).includes('[[Sports/Weeks/2026-12-28\\|2026-12-28]]'));
 const preserved = await parseWorkbook(mappedWorkbook({ removeStrategy: true }), { strategySheet: '', trackingSheet: 'My sessions', previous: plan });
 assert.deepEqual(preserved.weekPlans, plan.weekPlans);
 await assert.rejects(parseWorkbook(withWeekPlans([row, row])), /unique/);
 await assert.rejects(parseWorkbook(withWeekPlans([[...row.slice(0,1), '2026-12-29', ...row.slice(2)]])), /Monday/);
 await assert.rejects(parseWorkbook(withWeekPlans([row, ['2', '2026-12-28', ...row.slice(2)]])), /unique/);
 await assert.rejects(parseWorkbook(withWeekPlans([[...row.slice(0,6), '-1']])), /nonnegative/);
});

test('12-week workbook imports all planned sessions, typed dates, and blank results', async () => {
 const bytes = readFileSync('templates/Sports-12-week.xlsx');
 const plan = await parseWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { strategySheet: 'Strategy', trackingSheet: 'Training log' });
 assert.deepEqual(plan.weeklySchedule.map(item => [item.weekday, item.time, item.title, item.minutes]), [[2, '20:00', 'Swimming', null], [0, '10:30', 'Running', null]]);
 assert.equal(scheduleOn(plan, '2026-10-20')[0].title, 'Swimming');
 assert.equal(scheduleOn(plan, '2027-04-04')[0].title, 'Running');
 const weekly = weekMarkdown(plan, weekDates(new Date(2026, 9, 20, 12)), true);
 assert.ok(weekly.includes('20:00 Swimming'));
 assert.ok(weekly.includes('10:30 Running'));
 assert.equal(plan.weekPlans.length, 12);
 assert.equal(plan.sessions.length, 48);
 assert.equal(plan.weekPlans[0].start, '2026-10-26');
 assert.equal(plan.weekPlans.at(-1).start, '2027-01-11');
 assert.equal(plan.sessions[0].date, '2026-10-26');
 assert.equal(plan.sessions.at(-1).date, '2027-01-16');
 assert.equal(plan.weekPlans[3].phase, 'Deload');
 assert.equal(plan.weekPlans[7].phase, 'Deload');
 assert.equal(plan.weekPlans[11].phase, 'Test');
 assert.equal(plan.sessions[1].title, 'Handstand technique');
 assert.equal(plan.sessions[1].sport, 'training');
 assert.equal(plan.sessions[1].plannedMinutes, 10);
 assert.ok(plan.sessions.every(session => ['A', 'B', 'Technique', 'Core'].includes(session.block)));
 assert.ok(plan.sessions.every(session => !/swim|run|bike|mobility/i.test(`${session.title} ${session.prescription}`)));
 assert.equal(plan.weekPlans[0].minutes, 160);
 assert.equal(plan.sessions[0].plannedMinutes, 65);
 assert.ok(plan.sessions.every(session => session.actualMinutes === null && session.status === 'planned'));
 assert.ok(plan.sessions.every(session => Object.values(session.results).every(value => value === '')));
 assert.ok(plan.sessions.every(session => session.checks['Core done'] === null));
 for (const week of plan.weekPlans) {
  const dates = weekDates(new Date(`${week.start}T12:00:00`));
  const required = plan.sessions.filter(session => dates.includes(session.date) && !session.title.includes('optional'));
  assert.equal(required.reduce((sum, session) => sum + session.plannedMinutes, 0), week.minutes);
 }
 assert.equal(plan.goals.find(goal => goal.id === 'running').baseline, '12 km at 5:00/km (reported)');
});

test('regular activities are hidden by default without hiding explicit log entries or strategy', async () => {
 const plan = await parseWorkbook(workbook());
 const date = plan.sessions[0].date;
 plan.weeklySchedule = [{ id: 'swim', weekday: new Date(`${date}T12:00:00`).getDay(), time: '20:00', minutes: 60, title: 'Regular swim', recordedBy: 'Tracker', notes: '' }];
 const hidden = weekMarkdown(plan, [date]);
 assert.ok(!hidden.includes('Regular swim'));
 assert.ok(hidden.includes(plan.sessions[0].title));
 const shown = weekMarkdown(plan, [date], true);
 assert.ok(shown.includes('20:00 Regular swim'));
 assert.ok(strategyMarkdown(plan).includes('Regular swim'));
 assert.ok(!trainingLogMarkdown(plan).includes('Regular swim'));
});

test('Log and Plans split at today in the strategy timezone without losing sessions', async () => {
 const plan = await parseWorkbook(workbook());
 const session = plan.sessions[0];
 plan.sessions = ['2026-10-19','2026-10-20','2026-10-21','2026-10-22'].map(date => ({ ...session, date, id: date, title: `Manual ${date}` }));
 const now = new Date('2026-10-20T22:30:00Z'); // Already October 21 in Berlin.
 const log = datedLogMarkdown(plan, false, now);
 const plans = datedLogMarkdown(plan, true, now);
 assert.ok(log.includes('Manual 2026-10-21'));
 assert.ok(log.indexOf('Manual 2026-10-21') < log.indexOf('Manual 2026-10-19'));
 assert.ok(!log.includes('Manual 2026-10-22'));
 assert.ok(plans.includes('Manual 2026-10-22'));
 assert.ok(!plans.includes('Manual 2026-10-21'));
 assert.equal(plan.sessions.length, 4);
});

test('new workbooks start next Monday, with cached dates rebased across year and DST boundaries', async () => {
 const source = new Uint8Array(readFileSync('templates/Sports-12-week.xlsx'));
 const original = source.slice();
 for (const [now, tomorrow] of [[new Date(2026,9,20,23,59), '2026-10-26'], [new Date(2026,11,31,23,59), '2027-01-04'], [new Date(2026,2,28,23,59), '2026-03-30'], [new Date(2026,9,25,23,59), '2026-10-26'], [new Date(2026,9,26,12), '2026-11-02']]) {
  const bytes = startTemplateNextMonday(source, now);
  const plan = await parseWorkbook(bytes, { strategySheet: 'Strategy', trackingSheet: 'Training log' });
  assert.equal(plan.weekPlans[0].start, tomorrow);
  assert.equal(plan.sessions[0].date, tomorrow);
  assert.ok(plan.sessions.every(session => session.date >= tomorrow));
  assert.ok(plan.sessions.every(session => !/\((Mon|Tue|Thu|Sat)/.test(session.title)));
  const dates = plannedWeeks(plan, now);
  assert.ok(dates.includes(weekDates(new Date(`${tomorrow}T12:00:00`))[0]));
  assert.ok(dates.includes(plan.weekPlans.at(-1).start));
  const firstMonday = weekDates(new Date(`${tomorrow}T12:00:00`))[0];
  assert.ok(weeklyStrategy(plan, firstMonday).includes('Foundation'));
 }
 assert.deepEqual(source, original);
});

test('an already-current generated section recovers a stale baseline without overwriting commentary', () => {
 const note = `# Plans\n${generatedBlock('plan', 'Current output')}\nPersonal commentary\n`;
 assert.equal(mergeBlock(note, 'plan', 'Current output', generatedBlock('plan', 'Old output')), note);
 assert.equal(mergeBlock(note, 'plan', 'Current output'), note);
 assert.throws(() => mergeBlock(note, 'plan', 'Different output'), /trusted baseline/);
});

test('goal categories separate new skills from maintenance and core supports all three milestones', async () => {
 const source = new Uint8Array(readFileSync('templates/Sports-12-week.xlsx'));
 const plan = await parseWorkbook(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), { strategySheet: 'Strategy', trackingSheet: 'Training log' });
 const milestones = plan.goals.filter(goal => goal.category === 'milestone');
 assert.deepEqual(milestones.map(goal => goal.id), ['muscle-up', 'hspu', 'pistol']);
 assert.equal(plan.goals.find(goal => goal.id === 'running').category, 'maintenance');
 assert.deepEqual(plan.parts.find(part => part.id === 'Core').goalIds, ['muscle-up', 'hspu', 'pistol']);
 for (const markdown of [strategyMarkdown(plan), planMarkdown(plan, 'Sports', [])]) {
  assert.ok(markdown.includes('### Aspiration'));
  assert.ok(markdown.includes('### Maintenance'));
  assert.ok(markdown.indexOf('Running') > markdown.indexOf('### Maintenance'));
 }
 const core = strategyMarkdown(plan).split('### Core circuit')[1];
 assert.ok(core.includes('Supports: Muscle-up, Handstand push-up, Pistol squat'));
 const legacy = await parseWorkbook(workbook());
 assert.ok(legacy.goals.every(goal => goal.category === 'milestone'));
 const files = unzipSync(source);
 const xml = strFromU8(files['xl/worksheets/sheet1.xml']);
 const invalid = xml.replace('milestone', 'unknown-category');
 assert.notEqual(invalid, xml);
 files['xl/worksheets/sheet1.xml'] = strToU8(invalid);
 await assert.rejects(parseWorkbook(zipSync(files).buffer, { strategySheet: 'Strategy', trackingSheet: 'Training log' }), /category must be/);
});

test('template imports and rebases Daily without changing Recurring', async () => {
 const source = new Uint8Array(readFileSync('templates/Training-Example.xlsx'));
 const plan = await parseWorkbook(startTemplateNextMonday(source, new Date(2026, 11, 31, 12)));
 assert.equal(plan.sessions.length, 48);
 assert.equal(plan.sessions[0].date, '2027-01-04');
 assert.equal(plan.sessions.at(-1).date, '2027-03-27');
 assert.equal(plan.weekPlans[0].start, '2027-01-04');
 assert.deepEqual(plan.parts.find(part => part.id === 'A').goalIds, ['muscle-up', 'pistol']);
 assert.deepEqual(plan.weeklySchedule.map(item => [item.weekday, item.time, item.minutes]), [[2, '20:00', 60], [0, '10:30', 60]]);
 assert.ok(plan.weekPlans[0].blocks.A.includes('Scapular pull-up'));
 assert.ok(plan.exerciseArsenal.length > 40);
 assert.ok(strategyMarkdown(plan).includes('Exercise arsenal'));
 assert.ok(weeklyStrategy(plan, '2027-01-04').includes('Scapular pull-up'));
 assert.ok(plan.sessions.every(session => session.status === 'planned' && session.actualMinutes === null));
 const files = unzipSync(source);
 const strings = strFromU8(files['xl/sharedStrings.xml']);
 const invalid = strings.replaceAll('Easy scapular pull-up', 'Easy, scapular pull-up');
 files['xl/sharedStrings.xml'] = strToU8(invalid);
 const library = strFromU8(files['xl/worksheets/sheet5.xml']);
 const invalidLibrary = library.replaceAll('Easy scapular pull-up', 'Easy, scapular pull-up');
 assert.ok(invalid !== strings || invalidLibrary !== library);
 files['xl/worksheets/sheet5.xml'] = strToU8(invalidLibrary);
 await assert.rejects(parseWorkbook(zipSync(files).buffer), /must not contain commas/);
});

test('weekly schedule sheet can be selected independently, renamed, disabled, or rejected when missing', async () => {
 const saved = readFileSync('templates/Training-Example.xlsx');
 const source = saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength);
 const mapping = { strategySheet: '', trackingSheet: '', scheduleSheet: 'Recurring' };
 const scheduleOnly = await parseWorkbook(source, mapping);
 assert.equal(scheduleOnly.weeklySchedule.length, 2);
 assert.deepEqual(scheduleOnly.sessions, []);
 assert.deepEqual(scheduleOnly.goals, []);
 const files = unzipSync(new Uint8Array(source));
 const workbookXml = strFromU8(files['xl/workbook.xml']);
 const renamed = workbookXml.replace('name="Recurring"', 'name="Weekly rhythm"');
 assert.notEqual(renamed, workbookXml);
 files['xl/workbook.xml'] = strToU8(renamed);
 const custom = await parseWorkbook(zipSync(files).buffer, { ...mapping, scheduleSheet: 'Weekly rhythm' });
 assert.deepEqual(custom.weeklySchedule, scheduleOnly.weeklySchedule);
 const previous = { ...scheduleOnly, weeklySchedule: [{ ...scheduleOnly.weeklySchedule[0], title: 'Preserved cached schedule' }] };
 const disabled = await parseWorkbook(source, { strategySheet: 'Strategy', trackingSheet: 'Daily', scheduleSheet: '', previous });
 assert.deepEqual(disabled.weeklySchedule, previous.weeklySchedule);
 await assert.rejects(parseWorkbook(source, { ...mapping, scheduleSheet: 'Missing' }), /was not found/);
 await assert.rejects(parseWorkbook(source, { ...mapping, scheduleSheet: '' }), /at least one sheet/);
 await assert.rejects(parseWorkbook(source, { ...mapping, trackingSheet: 'Recurring' }), /different sheets/);
});

test('example goals have independent source mappings, a swimming goal, and exact result-column validation', async () => {
 const bytes = readFileSync('templates/Training-Example.xlsx');
 const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
 const plan = await parseWorkbook(buffer);
 assert.equal(plan.goals.find(goal => goal.id === 'hspu').resultColumn, undefined);
 assert.deepEqual(plan.goals.find(goal => goal.id === 'running').garminTypes, ['running']);
 const swim = plan.goals.find(goal => goal.id === 'swimming');
 assert.equal(swim.category, 'maintenance');
 assert.deepEqual(swim.garminTypes, ['swimming']);
 assert.equal(swim.resultColumn, undefined);
 const files = unzipSync(new Uint8Array(buffer));
 // Change only Strategy's mapping, not the Log header that uses the original shared string.
 const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
 const mappingCell = sheet.match(/<((?:\w+:)?)c\b[^>]*\br="G8"[^>]*?(?:\/>|>[\s\S]*?<\/\1c>)/);
 assert.ok(mappingCell);
 const prefix = mappingCell[1];
 files['xl/worksheets/sheet1.xml'] = strToU8(sheet.replace(mappingCell[0], `<${prefix}c r="G8" t="inlineStr"><${prefix}is><${prefix}t>Missing result</${prefix}t></${prefix}is></${prefix}c>`));
 await assert.rejects(parseWorkbook(zipSync(files).buffer), /result_column.*not found/);
});

test('daily iteration targets require explicit recording and preserve adjusted values', async () => {
 const rows = [['Date', 'Block', 'Plan', 'A done', 'A 1 result', 'A 2 result'], ['2026-10-26', 'A', 'A) Pull-up: 2 x 5', false, 5, 5]];
 let plan = await parseWorkbook(dailyWorkbook({ rows }), { strategySheet: '', trackingSheet: 'Daily' });
 assert.equal(plan.sessions[0].status, 'planned');
 assert.equal(plan.sessions[0].results['A 1 result'], '');
 rows[1][3] = true;
 rows[1][4] = 3;
 plan = await parseWorkbook(dailyWorkbook({ rows }), { strategySheet: '', trackingSheet: 'Daily' });
 assert.equal(plan.sessions[0].results['A 1 result'], '3');
 assert.equal(plan.sessions[0].results['A 2 result'], '5');
 assert.equal(plan.sessions[0].status, 'in-progress');
});

test('example labels daily skills and offers five unrecorded iteration targets', async () => {
 const bytes = readFileSync('templates/Training-Example.xlsx');
 const plan = await parseWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
 const first = plan.sessions[0];
 assert.ok(first.prescription.includes('A) Scapular pull-up'));
 assert.ok(first.prescription.includes('B) High pull'));
 assert.ok(first.prescription.includes('C) Box pistol'));
 assert.ok(!first.prescription.includes('Core: 30 sec work'));
 for (const letter of 'ABC') {
  assert.equal(first.checks[`${letter} done`], false);
  for (let i = 1; i <= 5; i++) assert.equal(first.results[`${letter} ${i} result`], '');
 }
 assert.ok(Object.values(first.results).every(value => value.trim() === ''));
});

test('grouped Core rounds import only after recording and preserve zero and adjustments', async () => {
 const rows = [['Daily training', '', '', 'Core', ''], ['Date', 'Block', 'Plan', 'Done', 'Rounds'], ['2026-10-26', 'A', 'Core: 5 rounds', false, 5]];
 const parse = () => parseWorkbook(dailyWorkbook({ rows }), { strategySheet: '', trackingSheet: 'Daily' });
 let session = (await parse()).sessions[0];
 assert.equal(session.checks['Core done'], false);
 assert.equal(session.results['Core rounds result'], '');
 assert.equal(session.status, 'planned');
 rows[2][3] = true;
 rows[2][4] = 3;
 session = (await parse()).sessions[0];
 assert.equal(session.checks['Core done'], true);
 assert.equal(session.results['Core rounds result'], '3');
 rows[2][4] = 0;
 assert.equal((await parse()).sessions[0].results['Core rounds result'], '0');
 for (const invalid of [-1, 1.5, 'many']) {
  rows[2][4] = invalid;
  await assert.rejects(parse(), /Core rounds must be a nonnegative whole number/);
 }
});

test('example iteration inputs use numbers and Excel times, and recorded times import as mm:ss', async () => {
 const files = unzipSync(new Uint8Array(readFileSync('templates/Training-Example.xlsx')));
 let sheet = strFromU8(files['xl/worksheets/sheet3.xml']);
 // Record the first handstand session without changing its timed targets.
 const flag = /<((?:\w+:)?)c\b[^>]*\br="G5"[^>]*>[\s\S]*?<\/\1c>/;
 const match = sheet.match(flag);
 assert.ok(match);
 const p = match[1];
 sheet = sheet.replace(flag, `<${p}c r="G5" t="b"><${p}v>1</${p}v></${p}c>`);
 files['xl/worksheets/sheet3.xml'] = strToU8(sheet);
 const plan = await parseWorkbook(zipSync(files).buffer);
 assert.equal(plan.sessions[2].results['A 1 result'], '00:20');
 assert.equal(plan.sessions[2].results['A 2 result'], '00:20');
 assert.equal(plan.sessions[0].results['A 1 result'], '');
 // The previously verbose negative-rep cells are stored as numeric counts.
 assert.match(sheet, /r="M21"[^>]*>\s*<(?:\w+:)?v>2<\/(?:\w+:)?v>/);
});

test('weekly layout groups workouts by day, folds comparisons, and retains partial planned durations', () => {
 const dates = ['2026-10-26', '2026-10-27'];
 const plan = { sessions: [
  { date: dates[0], title: 'Strength', sport: 'training', status: 'planned', plannedMinutes: 30, actualMinutes: null, prescription: 'A) Squat: 3 x 5', notes: 'Controlled pace', result: '' },
  { date: dates[0], title: 'Mobility', sport: 'training', status: 'planned', plannedMinutes: null, actualMinutes: null, prescription: '', notes: '', result: '' },
 ], parts: [], weekPlans: [], weeklySchedule: [] };
 const text = weekMarkdown(plan, dates);
 assert.ok(text.includes('[[#2026-10-26\\|Mon 26 Oct]]'));
 assert.ok(text.includes('| 30 + ? |'));
 assert.ok(text.includes('> [!note] Strength'));
 assert.ok(text.includes('> [!example-] Sets and comparisons'));
 assert.ok(text.includes('Controlled pace'));
 assert.ok(text.includes('### 2026-10-27'));
 assert.ok(!text.includes('Each bar uses its own'));
 assert.ok(!text.includes('## Imported schedule'));
});
