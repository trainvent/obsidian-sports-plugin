import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
const temp = mkdtempSync(`${tmpdir()}/sports-flexible-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
async function load(path) {
 const result = await build({ entryPoints: [`src/${path}.ts`], bundle: true, format: 'cjs', platform: 'node', write: false, loader: {'.md':'text'} });
 const target = `${temp}/${path.replaceAll('/', '-')}.cjs`;
 writeFileSync(target, result.outputFiles[0].text);
 return require(target);
}
const { dailyLog } = await load('workbook/daily-log');
const { exerciseTracking, aggregateValues } = await load('model/exercise-tracking');
const { parseWorkbook } = await load('workbook/parse');
const { performanceMarkdown, compactResults } = await load('notes/performance');
const { upgradeWorkbookGuide } = await load('notes/guide-upgrade');
const date = '2026-10-26';
const headers = ['Date', 'Session ID', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Done', 'Aggregate', 'Notes'];
const rows = [headers,
 [date, 'strength', 'Squat', 1, 'reps', 8, 7, true, 'total', 'Keep this'],
 [date, 'strength', 'Squat', 1, 'kg', 50, 45, true, 'average', 'And this'],
 [date, 'strength', 'Squat', 6, 'reps', 6, 0, true, 'total'],
 [date, 'strength', 'Squat', 6, 'kg', 60, 55, true, 'average'],
 [date, 'strength', 'Carry', 1, 'm', 30, 25, true, 'total'],
 [date, 'strength', 'Hold', 1, 'minutes', 2, '01:30', true, 'total'],
 [date, 'strength', 'Hold', 2, 'seconds', 45, 45, false, 'total'],
 [date, 'strength', 'Unplanned', 1000000, 'custom', '', 12, true, 'last'],
 [date, 'evening', 'Run', 1, 'km', 5, '', '', 'total'],
];

test('row-based Daily supports variable targets, arbitrary set labels, units, and sessions without A/B/C/Core', () => {
 const original = JSON.stringify(rows);
 const sessions = dailyLog(rows, [], false);
 assert.equal(sessions.length, 2);
 const session = sessions[0];
 const [reps, kg, carry, hold, other] = exerciseTracking(session);
 assert.deepEqual(reps.targets, [8, 6]);
 assert.deepEqual(reps.actual, [7, 0]);
 assert.deepEqual(reps.setNumbers, [1, 6]);
 assert.equal(kg.aggregation, 'average');
 assert.equal(aggregateValues(kg.actual, kg.aggregation), 50);
 assert.equal(carry.unit, 'm');
 assert.deepEqual(hold.targets, [120, 45]);
 assert.deepEqual(hold.actual, [90, null]);
 assert.deepEqual(hold.setChecks, [true, false]);
 assert.deepEqual(other.targets, [null]);
 assert.deepEqual(other.setNumbers, [1000000]);
 assert.equal(session.notes, 'Keep this\nAnd this');
 assert.equal(session.status, 'in-progress');
 assert.equal(sessions[1].status, 'planned');
 const markdown = performanceMarkdown(session);
 for (const text of ['(reps)\t14\t7', '(kg) · average\t55\t50', '(minutes)\t2.75\t1.5', '(custom) · last\t—\t12', '8 / 6 reps', 'Set 1 / 6: 7 / 0', 'partial']) assert.ok(markdown.includes(text), text);
 assert.ok(compactResults(session).includes('Squat: 50 kg'));
 assert.equal(JSON.stringify(rows), original);
});

test('Done gates results when present and explicit results record without Done; native times work', () => {
 const data = [['Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result'], [date, 'Hold', 1, 'seconds', new Date('1899-12-30T00:01:30Z'), new Date('1899-12-30T00:01:00Z')]];
 let session = dailyLog(data, [], false)[0];
 assert.deepEqual(session.tracking[0].targets, [90]);
 assert.deepEqual(session.tracking[0].actual, [60]);
 data[0].push('Done'); data[1].push('');
 session = dailyLog(data, [], false)[0];
 assert.deepEqual(session.tracking[0].actual, [null]);
 assert.equal(session.tracking[0].done, null);
 assert.equal(session.status, 'planned');
 data[1][6] = false;
 assert.equal(dailyLog(data, [], false)[0].tracking[0].done, false);
});

test('long rows reject duplicate keys, inconsistent sessions, invalid values and aggregations', () => {
 for (const [name, mutate, pattern] of [
  ['duplicate', data => data.push([...data[1]]), /duplicate/],
  ['dates', data => { data[2][0] = '2026-10-27'; }, /single date/],
  ['invalid set', data => { data[1][3] = 0; }, /positive whole/],
  ['invalid result', data => { data[1][6] = -1; }, /nonnegative/],
  ['invalid flag', data => { data[1][7] = 'yes'; }, /TRUE, FALSE/],
  ['invalid aggregation', data => { data[1][8] = 'median'; }, /Aggregate/],
  ['conflicting aggregation', data => { data[3][8] = 'average'; }, /conflicting Aggregate/],
 ]) {
  const data = structuredClone(rows); mutate(data);
  assert.throws(() => dailyLog(data, [], false), pattern, name);
 }
 const fields = ['Date', 'Session ID', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Block', 'Part version', 'Status', 'Title'];
 const valid = [fields, [date, 's', 'Squat', 1, 'reps', 5, 4, 'strength', '2', 'completed', 'Lift'], [date, 's', 'Squat', 2, 'reps', 5, 5, 'strength', '2', 'completed', 'Lift']];
 const part = { id: 'strength', version: '2', title: 'Strength' };
 const session = dailyLog(valid, [part], true)[0];
 assert.equal(session.partVersion, '2');
 assert.equal(session.status, 'completed');
 valid[2][10] = 'Conflicting title';
 assert.throws(() => dailyLog(valid, [part], true), /conflicting Title/);
 valid[2][10] = 'Lift'; valid[1][7] = 'unknown';
 assert.throws(() => dailyLog(valid, [part], true), /must match a strategy part/);
});

test('custom grouped and flat session layouts accept more than five sets and renamed rounds groups', () => {
 const data = [['Daily', '', '', 'Squat', '', '', '', '', '', '', '', 'Circuit', ''],
 ['Date', 'Block', 'Plan', 'Done', 1, 2, 3, 4, 5, 6, 7, 'Done', 'Rounds'],
 [date, '', 'Squat) Back squat: 7 x 5\nCircuit: 4 rounds', true, 5, 5, 5, 5, 5, 4, 3, false, 4]];
 const session = dailyLog(data, [], false)[0];
 assert.equal(session.results['Squat 7 result'], '3');
 assert.equal(session.results['Circuit rounds result'], '');
 const [squat, circuit] = exerciseTracking(session);
 assert.deepEqual(squat.targets, [5, 5, 5, 5, 5, 5, 5]);
 assert.deepEqual(squat.actual, [5, 5, 5, 5, 5, 4, 3]);
 assert.equal(circuit.done, false);
 const flat = [['Date', 'Block', 'Plan', 'Custom 12 result', 'Custom done'], [date, '', 'Custom) Work: 12 x 2', 2, false]];
 assert.equal(dailyLog(flat, [], false)[0].results['Custom 12 result'], '');
});

test('row-based format imports through actual XLSX selection and keeps custom goal measurements', async () => {
 const files = unzipSync(new Uint8Array(readFileSync('templates/Training-Example.xlsx')));
 const data = [['Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Done', 'Jump result'], [date, 'Jump', 1, 'cm', 40, 35, true, '35 cm']];
 const letter = i => { let value = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) value = String.fromCharCode(65 + (n - 1) % 26) + value; return value; };
 files['xl/worksheets/sheet3.xml'] = strToU8(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => `<c r="${letter(c)}${r + 1}" t="inlineStr"><is><t>${String(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);
 // Replace the stock load entries alongside the replaced Daily schedule.
 files['xl/worksheets/sheet6.xml'] = strToU8(strFromU8(files['xl/worksheets/sheet6.xml']).replace(/<(?:\w+:)?row\b[^>]*r="([0-9]+)"[^>]*>[\s\S]*?<\/(?:\w+:)?row>/g, (row, number) => Number(number) >= 3 ? '' : row));
 files['xl/worksheets/sheet4.xml'] = strToU8(strFromU8(files['xl/worksheets/sheet4.xml']).replace(/<(?:\w+:)?row\b[^>]*r="([0-9]+)"[^>]*>[\s\S]*?<\/(?:\w+:)?row>/g, (row, number) => Number(number) >= 5 ? '' : row));
 const plan = await parseWorkbook(zipSync(files).buffer, { strategySheet: '', trackingSheet: 'Daily', scheduleSheet: '' });
 assert.equal(plan.sessions[0].tracking[0].actual[0], 35);
 assert.equal(plan.sessions[0].results['Jump result'], '35 cm');
 assert.ok(performanceMarkdown(plan.sessions[0]).includes('(cm)\t40\t35'));
});

test('guide upgrade corrects obsolete stock requirements and preserves personalized text', () => {
 const obsolete = 'The template uses two header rows. Row 1 groups the exercise columns under\n**A**, **B**, **C** and **Core**. Row 2 contains the regular column names and\nsubheadings. Keep these labels and their alignment intact.';
 const updated = upgradeWorkbookGuide(`${obsolete}\n\nMy personal guidance`);
 assert.ok(updated.includes('not required names or limits'));
 assert.ok(updated.endsWith('My personal guidance'));
 assert.equal(upgradeWorkbookGuide('My adapted guide'), 'My adapted guide');
 assert.equal(upgradeWorkbookGuide(updated), updated);
});

test('all comparison aggregations preserve missing values and recorded zeros', () => {
 const values = [10, null, 0, 20];
 assert.equal(aggregateValues(values, 'total'), 30);
 assert.equal(aggregateValues(values, 'average'), 10);
 assert.equal(aggregateValues(values, 'min'), 0);
 assert.equal(aggregateValues(values, 'max'), 20);
 assert.equal(aggregateValues(values, 'last'), 20);
 assert.equal(aggregateValues([null], 'average'), null);
});

test('minute-based measurements retain canonical timing but display readable minutes', () => {
 const plan=dailyLog([headers,[date,'run','Easy run',1,'minutes',20,22,true,'total']],[],false);
 const metric=exerciseTracking(plan[0])[0];
 assert.equal(metric.unit,'seconds');assert.equal(metric.displayUnit,'minutes');
 assert.deepEqual(metric.targets,[1200]);assert.deepEqual(metric.actual,[1320]);
 const md=performanceMarkdown(plan[0]);
 assert.ok(md.includes('(minutes)\t20\t22'));
 assert.ok(md.includes('1 × 20 minutes'));
 assert.ok(!md.includes('1200 seconds'));
 assert.ok(compactResults(plan[0]).includes('22 minutes'));
 const zero=dailyLog([headers,[date,'run','Easy run',1,'minutes',20,0,true,'total']],[],false)[0];
 assert.ok(performanceMarkdown(zero).includes('(minutes)\t20\t0'));
});
