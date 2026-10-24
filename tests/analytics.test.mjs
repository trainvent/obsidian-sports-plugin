import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { zipSync, unzipSync, strFromU8, strToU8 } from 'fflate';
const temp = mkdtempSync(`${tmpdir()}/sports-analytics-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
async function load(path) {
 const result = await build({ entryPoints: [`src/${path}.ts`], bundle: true, format: 'cjs', platform: 'node', write: false });
 const target = `${temp}/${path.replaceAll('/', '-')}.cjs`;
 writeFileSync(target, result.outputFiles[0].text); return require(target);
}
const { dailyScores, median } = await load('model/daily-scores');
const { scoreFields } = await load('workbook/score-fields');
const { attachSessionScoring } = await load('workbook/session-scoring');
const { dailyLog } = await load('workbook/daily-log');
const { parseWorkbook } = await load('workbook/parse');
const { startTemplateNextMonday } = await load('workbook/template-dates');
const { analyticsNoteTasks, analyticsGraphMarkdown } = await load('notes/analytics');
const { registerScoreCharts } = await load('ui/score-chart');

test('Scoring summaries preserve zero, missing values and Daily effort; invalid matches fail', () => {
 const session = { id: 'one', date: '2026-10-26', title: 'Training', scores: scoreFields({ 'Planned intensity': '4.5', 'Effort rating': '3' }, 'test') };
 const header = ['Date', 'Session', 'Exercise', 'Performance', 'Scored metrics', 'Planned metrics'];
 const row = [new Date('2026-10-26T12:00:00Z'), 'Training', 'Pull-up', 0, 1, 4];
 attachSessionScoring([session], [header, row, ['2026-10-26', 'Training', 'Dip']]);
 assert.equal(session.scores.actualPerformance, 0);
 assert.equal(session.scores.effortRating, 3);
 assert.equal(session.scores.plannedIntensity, 4.5);
 assert.equal(session.scores.plannedMetrics, 4);
 assert.throws(() => attachSessionScoring([session], [header, row, row]), /duplicate/);
 assert.throws(() => attachSessionScoring([], [header, row]), /exactly one/);
 attachSessionScoring([session], [header, ['2026-10-26', 'Training', 'Pull-up', null, 0, 4]]);
 assert.equal(session.scores.actualPerformance, null);
});
const { registerScoreScatter, correlation } = await load('ui/score-scatter');
const { combinedAnalyticsMarkdown } = await load('notes/combined-analytics');
const { dailyNoteTasks, dailyIndexMarkdown } = await load('notes/daily');

test('daily summaries keep planned intensity, performance, and optional felt effort independent', () => {
 assert.equal(median([0, 200]), 100);
 assert.equal(median([undefined, 100, 80, 120, null]), 100);
 assert.equal(median([null, undefined]), null);
 const session = { date: '2026-10-26', scores: { expectedPerformance: 100, actualPerformance: 80, plannedIntensity: 2, effortRating: 5, scoredMetrics: 1, plannedMetrics: 3 } };
 const plan = { sessions: [session, { ...session, scores: { ...session.scores, actualPerformance: 120, plannedIntensity: 4, effortRating: null } }, { date: '2026-10-27' }] };
 const days = dailyScores(plan);
 assert.equal(days[0].actualPerformance, 100);
 assert.equal(days[0].plannedIntensity, 3);
 assert.equal(days[0].effortRating, 5);
 assert.equal(days[0].ratedSessions, 1);
 assert.equal(days[0].sessions, 2);
 assert.equal(days[0].scoredMetrics, 2);
 assert.equal(days[0].plannedMetrics, 6);
 assert.equal(days[1].effortRating, null);
 plan.sessions[0].scores.effortRating = 1;
 assert.equal(dailyScores(plan)[0].actualPerformance, 100);
 assert.equal(dailyScores(plan)[0].effortRating, 1);
 assert.deepEqual(dailyScores(null), []);
});

test('daily notes follow the plan timezone and also support Garmin-only dates in custom folders', () => {
 const sessions = ['2026-10-21', '2026-10-22'].map(date => ({ date, title: 'Practice', status: 'planned', result: '', notes: '', partId: '', partVersion: '', plannedMinutes: null, actualMinutes: null }));
 const plan = { timezone: 'Europe/Berlin', parts: [], sessions };
 const now = new Date('2026-10-20T22:30:00Z');
 const tasks = dailyNoteTasks(plan, 'My sports', undefined, now);
 assert.deepEqual(tasks.map(t => t.path), ['Analytics/Days/2026-10-21.md']);
 assert.ok(tasks[0].body.startsWith('## Sheet sessions'));
 const cache = { lastSuccess: '', activities: [{ id: '1', date: '2020-01-01', time: '08:00', name: 'Only watch', type: 'running', duration: null, distance: null, average_hr: null }] };
 const watch = dailyNoteTasks(null, 'My sports', cache, now);
 assert.equal(watch.length, 1);
 assert.ok(watch[0].body.includes('Only watch'));
 assert.ok(watch[0].body.includes('No sheet sessions'));
 assert.ok(dailyIndexMarkdown(null, 'My sports', cache, now).includes('0 sheet sessions, 1 smartwatch activity'));
});

test('score import validates numbers and coverage, retains explicit zeros and leaves absent fields unavailable', () => {
 assert.equal(scoreFields({}, 'test'), undefined);
 const scores = scoreFields({ 'Planned intensity': '3', 'Effort rating': '5', 'Actual performance': '0', 'Actual effort': '0', 'Expected RPE': '5', 'Actual RPE': '7', 'Scored metrics': '1', 'Planned metrics': '3' }, 'test');
 assert.equal(scores.plannedIntensity, 3); assert.equal(scores.effortRating, 5); assert.equal(scores.actualPerformance, 0); assert.equal(scores.actualEffort, 0); assert.equal(scores.expectedPerformance, null);
 for (const intensity of [0, 2.5, 6, 10]) assert.equal(scoreFields({ 'Planned intensity': String(intensity) }, 'test').plannedIntensity, intensity);
 for (const entry of [{ 'Planned intensity': '-1' }, { 'Planned intensity': '11' }, { 'Planned intensity': 'NaN' }, { 'Effort rating': '0' }, { 'Effort rating': '6' }, { 'Effort rating': '2.5' }, { 'Effort rating': '-1' }, { 'Expected RPE': '11' }, { 'Actual effort': '-1' }, { 'Scored metrics': '1.5' }, { 'Scored metrics': '4', 'Planned metrics': '3' }]) assert.throws(() => scoreFields(entry, 'test'));
 const rows = [['Date', 'Block', 'Plan', 'Expected performance', 'Actual performance'], ['2026-10-26', '', 'Free text', 100, 0]];
 assert.equal(dailyLog(rows, [], false)[0].scores.actualPerformance, 0);
 assert.equal(dailyLog(rows, [], false)[0].status, 'in-progress');
 const long = [['Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Expected performance', 'Actual performance'], ['2026-10-26', 'Run', 1, 'm', 100, 90, 100, 90]];
 assert.equal(dailyLog(long, [], false)[0].scores.actualPerformance, 90);
});

test('all done records exercise targets together while preserving individual controls and explicit session status', () => {
 const rows = [['Date', 'Block', 'Plan', 'Status', 'A done', 'A 1 result', 'B done', 'B 1 result', 'Core done', 'Core rounds result', 'All done'], ['2026-10-26', '', 'Training', 'planned', false, 5, false, '00:20', false, 3, true]];
 const parse = () => dailyLog(rows, [], false)[0];
 let session = parse();
 assert.deepEqual(session.checks, { 'A done': true, 'B done': true, 'Core done': true });
 assert.equal(session.results['A 1 result'], '5');
 assert.equal(session.results['B 1 result'], '00:20');
 assert.equal(session.results['Core rounds result'], '3');
 assert.equal(session.status, 'planned');
 for (const value of [false, '']) {
  rows[1][10] = value;
  session = parse();
  assert.equal(session.checks['A done'], false);
  assert.equal(session.results['A 1 result'], '');
 }
 rows[1][4] = true;
 assert.equal(parse().results['A 1 result'], '5');
 assert.equal(parse().results['B 1 result'], '');
 rows[1][10] = 'yes';
 assert.throws(parse, /All done must be TRUE, FALSE, or blank/);
});

test('scoring workbook imports saved formulas, no invented actuals, and rebases linked Scoring dates', async () => {
 const bytes = new Uint8Array(readFileSync('templates/Training-Example.xlsx'));
 const plan = await parseWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
 assert.equal(plan.sessions[0].scores.expectedPerformance, null);
 assert.equal(plan.sessions[0].scores.actualPerformance, null);
 assert.equal(plan.sessions[0].scores.plannedIntensity, 4.5);
 assert.ok(plan.sessions.every(session => Number.isFinite(session.scores.plannedIntensity) && session.scores.plannedIntensity >= 0 && session.scores.plannedIntensity <= 10));
 assert.equal(plan.sessions[0].scores.effortRating, null);
 assert.equal(plan.sessions[0].scores.plannedMetrics, 4);
 assert.equal(plan.sessions[0].scores.scoredMetrics, 0);
 const rebased = new Uint8Array(startTemplateNextMonday(bytes, new Date(2027, 0, 1, 12)));
 const files = unzipSync(rebased);
 const scoring = strFromU8(files['xl/worksheets/sheet4.xml']);
 const log = strFromU8(files['xl/worksheets/sheet3.xml']);
 const cellValue = (xml, address) => xml.match(new RegExp(`<(?:(?:\\w+):)?c\\b(?![^>]*\\/>)[^>]*r="${address}"[^>]*>[\\s\\S]*?<\\/(?:(?:\\w+):)?c>`))?.[0].match(/<(?:\w+:)?v>([^<]+)<\/(?:\w+:)?v>/)?.[1];
 assert.equal(cellValue(scoring, 'A5'), cellValue(log, 'A3'));
 // Performance now imports from the unified Scoring session summary.
 let xml = scoring;
 for (const address of ['Q5']) xml = xml.replace(new RegExp(`<((?:\\w+:)?)c\\b[^>]*r="${address}"[^>]*>[\\s\\S]*?<\\/\\1c>`), (_, p) => `<${p}c r="${address}"><${p}v>0</${p}v></${p}c>`);
 files['xl/worksheets/sheet4.xml'] = strToU8(xml);
 const recorded = await parseWorkbook(zipSync(files).buffer);
 assert.equal(recorded.sessions[0].scores.actualPerformance, 0);
 assert.equal(recorded.sessions[0].scores.effortRating, null);
});

test('analytics pages separate their content and graph preserves missing values without plotting zeros', () => {
 const plan = { parts: [], sessions: [{ date: '2026-10-26', title: 'Training', result: '', status: 'planned', notes: '', sport: 'training', plannedMinutes: 30, actualMinutes: null, scores: { expectedPerformance: 100, actualPerformance: null, plannedIntensity: 3, effortRating: null, scoredMetrics: 0, plannedMetrics: 3 } }] };
 const pages = analyticsNoteTasks(plan, 'Custom sports');
 assert.deepEqual(pages.map(page => page.path), ['Overview.md', 'Analytics/Days/_Index.md', 'Analytics/Sheet.md', 'Analytics/Smartwatch.md', 'Stats.md']);
 const graph = analyticsGraphMarkdown(plan, 'Custom sports');
 assert.ok(graph.includes('2026-10-26\t—'));
 assert.equal((graph.match(/```sports-trend/g) ?? []).length, 3);
 assert.ok(graph.includes('Date\tFelt effort (1–5)\tPlanned intensity (0–10)'));
 assert.ok(graph.includes('2026-10-26\t—\t3'));
 assert.ok(!graph.includes('minutes × RPE'));
 assert.ok(!graph.includes('| Date |'));
 assert.ok(!pages.some(page => page.path === 'Analytics/Table.md'));
 assert.ok(!graph.includes('Analytics/Table'));
 assert.ok(graph.indexOf('## Effort and intensity over time') < graph.indexOf('## Daily performance'));
 assert.ok(pages[0].body.includes('[[Custom sports/Analytics/Sheet|Sheet]]'));
});

test('time comparisons show independently available values on each date', () => {
 const make = (date, scores) => ({ date, title: 'Training', scores });
 const graph = analyticsGraphMarkdown({ sessions: [
  make('2026-10-26', { plannedIntensity: 0, actualPerformance: 0, effortRating: 1, plannedMetrics: 2, scoredMetrics: 2 }),
  make('2026-10-27', { plannedIntensity: 8, actualPerformance: 120, effortRating: 5, plannedMetrics: 2, scoredMetrics: 1 }),
  make('2026-10-28', { plannedIntensity: 3 }), make('2026-10-29', { effortRating: 4 }),
 ] }, 'Sports');
 const [performance, effort] = [...graph.matchAll(/```sports-trend\n([\s\S]*?)\n```/g)].map(match => match[1]);
 assert.ok(performance.includes('2026-10-26\t0\t0'));
 assert.ok(performance.includes('2026-10-27\t9.6\t8'));
 assert.ok(performance.includes('2026-10-28\t—\t3'));
 assert.ok(effort.includes('2026-10-28\t—\t3'));
 assert.ok(effort.includes('2026-10-29\t4\t—'));
 assert.ok(!graph.includes('sports-scatter'));
});

test('performance scales each session before aggregation and follows intensity at 100 percent', () => {
 const sessions = [
  { date: '2026-10-26', scores: { plannedIntensity: 6, actualPerformance: 100 } },
  { date: '2026-10-27', scores: { plannedIntensity: 6, actualPerformance: 80 } },
  { date: '2026-10-28', scores: { plannedIntensity: 10, actualPerformance: 120 } },
  { date: '2026-10-29', scores: { plannedIntensity: 2, actualPerformance: 200 } },
  { date: '2026-10-29', scores: { plannedIntensity: 8, actualPerformance: 50 } },
 ];
 const chart = analyticsGraphMarkdown({ sessions }, 'Sports').split('```')[1];
 for (const row of ['2026-10-26\t6\t6', '2026-10-27\t4.8\t6', '2026-10-28\t12\t10', '2026-10-29\t4\t5']) assert.ok(chart.includes(row));
});

test('scatter correlation requires variable paired samples', () => {
 assert.equal(correlation([{ x: 0, y: 0 }, { x: 5, y: 50 }, { x: 10, y: 100 }]), 1);
 assert.equal(correlation([{ x: 0, y: 100 }, { x: 5, y: 50 }, { x: 10, y: 0 }]), -1);
 assert.equal(correlation([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }]), null);
 assert.equal(correlation([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]), null);
 assert.equal(correlation([{ x: 1, y: 1 }, { x: 2, y: 2 }]), null);
});

class Element {
 constructor(tag = 'div', options = {}) { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = options.text; this.namespaceURI = 'http://www.w3.org/2000/svg'; }
 createSpan(options) { return this.createEl('span', options); }
 createDiv(options) { return this.createEl('div', options); }
 createEl(tag, options) { const child = new Element(tag, options); this.children.push(child); return child; }
 createSvg(tag) { return this.createEl(tag); }
 setAttribute(key, value) { this.attributes[key] = value; }
 appendChild(child) { this.children.push(child); }
}
test('scatter renderer places points against intensity and preserves scale boundaries', () => {
 let render; registerScoreScatter({ registerMarkdownCodeBlockProcessor: (_, callback) => { render = callback; } });
 const previous = globalThis.document;
 globalThis.document = { createElementNS: (_, tag) => new Element(tag) };
 try {
  const root = new Element();
  render('Session\tPlanned intensity (0–10)\tPerformance (%)\nLow\t0\t0\nMid\t5\t50\nHigh\t10\t100', root);
  assert.ok(root.children[0].children[0].textContent.includes('Pearson r = 1.00'));
  const svg = root.children[0].children[1];
  const points = svg.children.filter(child => child.tag === 'circle');
  assert.deepEqual(points.map(p => p.attributes.cx), ['65', '365', '665']);
  assert.deepEqual(points.map(p => p.attributes.cy), ['230', '132.5', '35']);
  const ratings = new Element();
  render('Session\tPlanned intensity (0–10)\tFelt effort (1–5)\nEasy\t0\t1\nHard\t10\t5', ratings);
  assert.deepEqual(ratings.children[0].children[1].children.filter(c => c.tag === 'circle').map(c => c.attributes.cy), ['230', '35']);
  const empty = new Element(); render('Session\tPlanned intensity (0–10)\tPerformance (%)', empty);
  assert.ok(empty.children[0].textContent.includes('planned intensity'));
  const intensityOnly = new Element();
  render('Session\tPlanned intensity (0–10)\tPerformance (%)\nPlanned\t0\t—\nHard\t10\t—', intensityOnly);
  const intensitySvg = intensityOnly.children[0].children[1];
  assert.equal(intensitySvg.children.filter(c => c.tag === 'circle').length, 0);
  const marks = intensitySvg.children.filter(c => c.tag === 'line' && c.attributes.y1 === '300');
  assert.deepEqual(marks.map(c => c.attributes.x1), ['65', '665']);
  assert.ok(intensityOnly.children[0].children[0].textContent.includes('0 paired sessions · 2 intensity only'));
  assert.ok(!intensityOnly.children[0].children[0].textContent.includes('Pearson r ='));
  const mixed = new Element();
  render('Session\tPlanned intensity (0–10)\tFelt effort (1–5)\nRecorded\t3\t4\nPlanned\t5\t—', mixed);
  assert.equal(mixed.children[0].children[1].children.filter(c => c.tag === 'circle').length, 1);
  for (const value of ['NaN', '11', '-1']) {
   const invalid = new Element(); render(`Session\tPlanned intensity (0–10)\tPerformance (%)\nTest\t${value}\t100`, invalid);
   assert.equal(invalid.children[0].tag, 'pre');
  }
 } finally { globalThis.document = previous; }
});
test('score charts break lines at missing measurements and retain recorded zero points', () => {
 let render; registerScoreCharts({ registerMarkdownCodeBlockProcessor: (_, callback) => { render = callback; } });
 const previous = globalThis.document;
 globalThis.document = { createElementNS: (_, tag) => new Element(tag) };
 try {
  const root = new Element();
  render('Date\tExpected\tActual\n2026-10-26\t100\t80\n2026-10-27\t100\t—\n2026-10-28\t100\t0', root);
  const svg = root.children[0].children[1];
  const actual = svg.children.filter(child => child.attributes.class === 'sports-score-actual');
  assert.equal(actual.filter(child => child.tag === 'circle').length, 2);
  assert.equal(actual.filter(child => child.tag === 'line').length, 0);
  assert.equal(actual[1].attributes.cy, '210');
  const ratings = new Element();
  render('Date\tPlanned intensity\tFelt effort (optional)\n2026-10-26\t3\t5', ratings);
  const ratingsSvg = ratings.children[0].children[1];
  const ratingPoints = ratingsSvg.children.filter(child => child.tag === 'circle');
  assert.equal(ratingPoints[0].attributes.cy, '157.5');
  assert.equal(ratingPoints[1].attributes.cy, '122.5');
  const boundaries = new Element();
  render('Date\tPlanned intensity\tFelt effort (optional)\n2026-10-26\t0\t—\n2026-10-27\t10\t—', boundaries);
  assert.deepEqual(boundaries.children[0].children[1].children.filter(child => child.tag === 'circle').map(child => child.attributes.cy), ['210', '35']);
  const combined = new Element();
  render('Date\tPlanned intensity (0–10)\tWatch heart rate (bpm)\n2026-10-26\t5\t100', combined);
  assert.deepEqual(combined.children[0].children[1].children.filter(c => c.tag === 'circle').map(c => c.attributes.cy), ['122.5', '122.5']);
  const dual = new Element();
  render('Date\tFelt effort (1–5)\tPlanned intensity (0–10)\n2026-10-26\t5\t10\n2026-10-27\t—\t0', dual);
  const dualSvg = dual.children[0].children[1];
  assert.deepEqual(dualSvg.children.filter(c => c.tag === 'circle').map(c => c.attributes.cy), ['35', '35', '210']);
  assert.ok(dual.children[0].children[0].children[0].children[1].textContent.includes('left axis'));
  assert.ok(dual.children[0].children[0].children[1].children[1].textContent.includes('right axis'));
  assert.ok(dualSvg.children.some(c => c.tag === 'text' && c.attributes.x === '680' && c.textContent === '10'));
  const intensity = new Element();
  render('Date\tPerformance (%)\tPlanned intensity (0–10)\n2026-10-26\t—\t5', intensity);
  assert.equal(intensity.children[0].children[1].children.filter(c => c.tag === 'circle')[0].attributes.cy, '122.5');
  const scaled = new Element();
  render('Date\tPerformance × intensity\tPlanned intensity (0–10)\n2026-10-26\t6\t6\n2026-10-27\t12\t10', scaled);
  const scaledPoints = scaled.children[0].children[1].children.filter(c => c.tag === 'circle');
  assert.equal(scaledPoints[0].attributes.cy, scaledPoints[2].attributes.cy);
  assert.equal(scaledPoints[1].attributes.cy, '35');
  const daily = new Element();
  render('Date\tPerformance (%)\n2026-10-26\t0\n2026-10-27\t100\n2026-10-28\t200', daily);
  const dailySvg = daily.children[0].children[1];
  assert.deepEqual(dailySvg.children.filter(c => c.tag === 'circle').map(c => c.attributes.cy), ['210', '122.5', '35']);
  assert.deepEqual(dailySvg.children.filter(c => c.tag === 'text' && c.attributes.x === '43').map(c => c.textContent), ['0%', '100%', '200%']);
  assert.equal(dailySvg.children.filter(c => c.attributes.class === 'sports-score-expected').length, 0);
  const noPerformance = new Element();
  render('Date\tPerformance (%)\n2026-10-26\t—', noPerformance);
  assert.equal(noPerformance.children[0].children[1].tag, 'svg');
  assert.equal(noPerformance.children[0].children[1].children.filter(c => c.tag === 'circle').length, 0);
  const empty = new Element(); render('Date\tExpected\tActual\n2026-10-26\t—\t—', empty);
  assert.ok(empty.children[0].textContent.includes('No values recorded'));
  const invalid = new Element(); render('Date\tExpected\tActual\n<script>\t100\tNaN', invalid);
  assert.equal(invalid.children[0].tag, 'pre');
 } finally { globalThis.document = previous; }
});


test('Combined keeps source minutes separate and preserves missing measurements', () => {
 const plan = { timezone: 'UTC', sessions: [
  { date: '2020-01-01', actualMinutes: 30, scores: { plannedIntensity: 6, effortRating: 3 } },
  { date: '2020-01-01', actualMinutes: null, scores: { plannedIntensity: 8, effortRating: 5 } },
  { date: '2020-01-02', actualMinutes: 0 },
  { date: '2019-12-01', actualMinutes: null },
  { date: '2099-01-01', actualMinutes: 50 },
 ] };
 const cache = { start: '2020-01-01', end: '2020-01-03', lastSuccess: '2020-01-04', activities: [
  { date: '2020-01-01', duration: 600, average_hr: 140, hr_zones: [60, 0, 0, 0, 0] },
  { date: '2020-01-01', duration: 1200, average_hr: 160, hr_zones: [0, 0, 0, 0, 180] },
  { date: '2020-01-03', duration: null, average_hr: null },
 ] };
 const body = combinedAnalyticsMarkdown(plan, 'Custom', cache, new Date('2020-01-04T12:00:00Z'));
 assert.ok(body.includes('2020-01-01\t30\t30'));
 assert.ok(body.includes('2020-01-01\t4\t4'));
 assert.ok(body.includes('2020-01-02\t0\t0'));
 assert.ok(body.includes('2019-12-01\t—\t—'));
 assert.ok(body.includes('2020-01-03\t—\t—'));
 assert.ok(!body.includes('2099-01-01'));
 assert.ok(!body.includes('[[Custom/Overview|Overview]]'));
});
