import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-combined-log-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({ entryPoints: ['src/notes/combined-log.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
writeFileSync(`${temp}/log.cjs`, output.outputFiles[0].text);
const { combinedLogMarkdown } = createRequire(import.meta.url)(`${temp}/log.cjs`);
const now = new Date('2026-10-20T22:30:00Z'); // October 21 in Berlin.
const session = { id: 's1', date: '2026-10-21', title: 'Skills', block: 'A', sport: 'training', partId: '', partVersion: '', prescription: 'Practice', plannedMinutes: 30, actualMinutes: 0, result: 'Core done: no', status: 'planned', notes: 'Keep this note' };
const activity = { id: '123', date: '2026-10-21', time: '20:00', name: 'Swim', type: 'lap_swimming', duration: 3600, distance: 2000, average_hr: 130 };

test('combined log has one row per past or current date, keeping every manual session and Garmin record', () => {
 const plan = { timezone: 'Europe/Berlin', parts: [], sessions: [session, { ...session, id: 's2', title: 'Evening skills', result: 'HSPU result: 3 reps', notes: 'Second note' }, { ...session, id: 's3', date: '2026-10-19' }, { ...session, id: 's4', date: '2026-10-18' }, { ...session, id: 'future', date: '2026-10-22' }] };
 const cache = { lastSuccess: '2026-10-21T09:00:00Z', start: '2026-10-19', end: '2026-10-21', error: '', activities: [activity, { ...activity, id: '124', time: '09:00', name: 'Morning run' }, { ...activity, id: '125', date: '2026-10-20', name: 'Garmin-only day' }, { ...activity, id: '126', date: '2026-10-22', name: 'Future activity' }] };
 const original = JSON.stringify({ plan, cache });
 const text = combinedLogMarkdown(plan, cache, now);
 const rows = text.split('\n').filter(line => /^\| 2026-/.test(line));
 assert.equal(rows.length, 4);
 assert.equal(rows.filter(row => row.startsWith('| 2026-10-21 |')).length, 1);
 assert.ok(rows[0].includes('Evening skills') && rows[0].includes('Second note'));
 assert.ok(rows[0].includes('Core done: no') && rows[0].includes('Actual: 0 min'));
 assert.ok(rows[0].includes('Status: planned') && rows[0].includes('3 reps'));
 assert.ok(rows[0].indexOf('Morning run') < rows[0].indexOf('[Swim]'));
 assert.ok(rows[1].includes('Garmin-only day'));
 assert.ok(rows[2].includes('None recorded'));
 assert.ok(rows[3].includes('Not imported'));
 assert.ok(!text.includes('2026-10-22'));
 assert.equal(text.split('| Date |').length - 1, 1);
 assert.equal(JSON.stringify({ plan, cache }), original);
});

test('combined log supports tracker-only history, cached warnings and safely escaped cells', () => {
 const cache = { activities: [{ ...activity, date: '2026-10-20', name: '<img> [test](url) | name' }], error: 'Disconnected', lastSuccess: '', start: '', end: '' };
 const text = combinedLogMarkdown(null, cache, now);
 assert.ok(text.includes('Cached activities are retained'));
 assert.ok(text.includes('&lt;img&gt; \\[test\\]'));
 assert.ok(text.includes('&#124;'));
 assert.ok(text.includes('| — | — |'));
 assert.ok(!text.includes('## Recorded Garmin activities'));
 assert.ok(combinedLogMarkdown(null, undefined, now).includes('No log entries'));
});
