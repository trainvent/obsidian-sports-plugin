import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-goal-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({ stdin: { contents: "export { goalNoteTask } from './src/notes/goal-notes'; export { goalResultColumn, goalGarminTypes, matchesGarminType } from './src/notes/goal-sources'; export { goalNotePath } from './src/notes/goal-files';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
writeFileSync(`${temp}/goals.cjs`, output.outputFiles[0].text);
const { goalNoteTask, goalResultColumn, goalGarminTypes, matchesGarminType, goalNotePath } = createRequire(import.meta.url)(`${temp}/goals.cjs`);
const session = { id: 's1', date: '2026-10-21', title: 'Training', status: 'in-progress', notes: 'Session context', results: { 'Running result': 'Felt easier today', 'HSPU result': '3 slow reps', 'Swimming result': 'Worked on breathing' } };
const plan = { parts: [], sessions: [session] };
const record = { id: '123', date: '2026-10-21', time: '09:00', name: 'Laufen', type: 'track_running', duration: 1800, distance: 5000, average_hr: 140 };
const cache = { activities: [record, { ...record, id: '124', type: 'walking', name: 'Walking named Laufen' }, { ...record, id: '125', type: 'lap_swimming', name: 'Schwimmen' }, { ...record, id: '126', type: 'open_water_swimming', name: 'Open water' }], lastSuccess: '2026-10-21T10:00:00Z', start: '2026-10-01', end: '2026-10-21', error: '' };

test('a running aspiration collects both matching XLSX entries and Garmin types, regardless of localized names', () => {
 const goal = { id: 'running', title: 'Running', category: 'milestone', benchmark: 'Faster 5 km' };
 const task = goalNoteTask(goal, plan, cache, 'Sports');
 assert.ok(task.body.includes('Felt easier today'));
 assert.ok(task.body.includes('[Laufen]'));
 assert.ok(!task.body.includes('Walking named Laufen'));
 assert.ok(!task.body.includes('Schwimmen'));
 assert.ok(!task.body.includes('3 slow reps'));
 assert.ok(task.initial.includes('## Review'));
 assert.ok(!task.body.includes('## Review'));
 const maintenance = goalNoteTask({ ...goal, category: 'maintenance' }, plan, cache, 'Sports');
 assert.ok(maintenance.body.includes('Felt easier today') && maintenance.body.includes('[Laufen]'));
});
test('a maintenance goal can collect both sources, with custom explicit mappings', () => {
 const goal = { id: 'swim-goal', title: 'Better technique', category: 'maintenance', benchmark: '', resultColumn: 'Swimming result', garminTypes: ['swimming'] };
 const task = goalNoteTask(goal, plan, cache, 'Sports');
 assert.ok(task.body.includes('Worked on breathing'));
 assert.ok(task.body.includes('Schwimmen') && task.body.includes('Open water'));
 assert.ok(!task.body.includes('Felt easier today'));
 assert.ok(!task.body.includes('[Laufen]'));
});
test('old skill columns resolve independently of category, while ambiguous matches need explicit mapping', () => {
 assert.equal(goalResultColumn({ id: 'hspu', title: 'Handstand push-up', category: 'maintenance' }, [session]), 'HSPU result');
 const sessions = [{ results: { 'Pistol result': 'A', 'Pistol squat result': 'B' } }];
 assert.equal(goalResultColumn({ id: 'pistol', title: 'Pistol squat' }, sessions), undefined);
 assert.equal(goalResultColumn({ id: 'pistol', title: 'Pistol squat', resultColumn: 'Pistol result' }, sessions), 'Pistol result');
 assert.deepEqual(goalGarminTypes({ id: 'running', title: 'Goal', garminTypes: ['cycling'] }), ['cycling']);
 assert.ok(matchesGarminType('trail_running', ['running']));
 assert.ok(!matchesGarminType('walking', ['running']));
});
test('goal paths stay stable on title changes and encode traversal and wikilink punctuation', () => {
 const goal = { id: '../unsafe|goal#', title: 'Original title' };
 const path = goalNotePath(goal);
 assert.ok(path.startsWith('Goals/'));
 assert.ok(!path.slice(6).includes('/') && !path.includes('../') && !path.includes('|') && !path.includes('#'));
 assert.equal(goalNotePath({ ...goal, title: 'Changed title' }), path);
});
