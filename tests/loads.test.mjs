import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { odsArchive } from './ods-fixtures.mjs';
const temp = mkdtempSync(`${tmpdir()}/sports-loads-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const result = await build({ stdin: { contents: "export { parseWorkbook } from './src/workbook/parse'; export { exerciseTracking } from './src/model/exercise-tracking'; export { performanceMarkdown } from './src/notes/performance';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false });
writeFileSync(`${temp}/loads.cjs`, result.outputFiles[0].text);
const { parseWorkbook, exerciseTracking, performanceMarkdown } = createRequire(import.meta.url)(`${temp}/loads.cjs`);
const config = { strategySheet: '', trackingSheet: 'Daily', scheduleSheet: '' };
const load = ['2026-10-26', 'Training', 'Squat', 'Weight vest', 6, null, 'Optional'];
function workbook(rows = [load], done = false, actual = null) {
 return odsArchive([
  { sheet: 'Daily', data: [['Date', 'Block', 'Plan', 'Title', 'Core done', 'Core rounds result', 'All done'], ['2026-10-26', 'A', 'Core: 5 rounds', 'Training', done, 5, actual]] },
  { sheet: 'Library', data: [['Exercise arsenal'], ['Group', 'Exercise', 'Base intensity (0–10)', 'Unit', 'Growth per kg'], ['Core', 'Squat', 5, 'seconds', .02], [], ['Equipment'], ['Equipment', 'Min kg', 'Max kg', 'Notes'], ['Weight vest', 6, 10, 'Optional']] },
  { sheet: 'Loads', data: [['Added load'], ['Date', 'Session', 'Exercise', 'Equipment', 'Planned kg', 'Actual kg', 'Notes'], ...rows] },
 ]);
}
test('sparse load entries import equipment and growth metadata without widening Daily', async () => {
 const plan = await parseWorkbook(workbook(), config);
 assert.deepEqual(plan.equipment[0], { name: 'Weight vest', minKg: 6, maxKg: 10, notes: 'Optional' });
 assert.equal(plan.exerciseArsenal[0].growthPerKg, .02);
 assert.equal(plan.sessions[0].loads[0].plannedKg, 6);
 assert.equal(plan.sessions[0].loads[0].actualKg, null);
 assert.equal(plan.sessions[0].status, 'planned');
 const metric = exerciseTracking(plan.sessions[0]).find(exercise => exercise.unit === 'kg');
 assert.deepEqual(metric.targets, [6]); assert.deepEqual(metric.actual, [null]);
 assert.ok(performanceMarkdown(plan.sessions[0]).includes('(kg) · last\t6\t—'));
});
test('actual kg remains explicit, zero is bodyweight, and Done does not invent a load result', async () => {
 const missing = await parseWorkbook(workbook([load], false, true), config);
 assert.equal(missing.sessions[0].loads[0].actualKg, null);
 assert.deepEqual(exerciseTracking(missing.sessions[0]).find(e => e.unit === 'kg').actual, [null]);
 const bodyweight = [...load]; bodyweight[5] = 0;
 const recorded = await parseWorkbook(workbook([bodyweight], true), config);
 assert.deepEqual(exerciseTracking(recorded.sessions[0]).find(e => e.unit === 'kg').actual, [0]);
 const pending = await parseWorkbook(workbook([bodyweight], false), config);
 assert.deepEqual(exerciseTracking(pending.sessions[0]).find(e => e.unit === 'kg').actual, [null]);
});
test('loads reject duplicates, unmatched sessions/exercises and invalid equipment weights', async () => {
 await assert.rejects(parseWorkbook(workbook([load, load]), config), /duplicate/);
 for (const [column, value] of [[0, '2026-10-27'], [1, 'Other'], [2, 'Pull-up'], [3, 'Unknown'], [4, -1], [4, 11], [4, null], [5, -1]]) {
  const row = [...load]; row[column] = value;
  await assert.rejects(parseWorkbook(workbook([row]), config));
 }
});
