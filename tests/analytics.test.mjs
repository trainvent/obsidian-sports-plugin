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
const { dailyLog } = await load('workbook/daily-log');
const { parseWorkbook } = await load('workbook/parse');
const { startTemplateNextMonday } = await load('workbook/template-dates');
const { analyticsNoteTasks, analyticsGraphMarkdown } = await load('notes/analytics');
const { registerScoreCharts } = await load('ui/score-chart');

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

test('score import validates numbers and coverage, retains explicit zeros and leaves absent fields unavailable', () => {
 assert.equal(scoreFields({}, 'test'), undefined);
 const scores = scoreFields({ 'Planned intensity': '3', 'Effort rating': '5', 'Actual performance': '0', 'Actual effort': '0', 'Expected RPE': '5', 'Actual RPE': '7', 'Scored metrics': '1', 'Planned metrics': '3' }, 'test');
 assert.equal(scores.plannedIntensity, 3); assert.equal(scores.effortRating, 5); assert.equal(scores.actualPerformance, 0); assert.equal(scores.actualEffort, 0); assert.equal(scores.expectedPerformance, null);
 for (const entry of [{ 'Planned intensity': '0' }, { 'Planned intensity': '6' }, { 'Effort rating': '2.5' }, { 'Effort rating': '-1' }, { 'Expected RPE': '11' }, { 'Actual effort': '-1' }, { 'Scored metrics': '1.5' }, { 'Scored metrics': '4', 'Planned metrics': '3' }]) assert.throws(() => scoreFields(entry, 'test'));
 const rows = [['Date', 'Block', 'Plan', 'Expected performance', 'Actual performance'], ['2026-10-26', '', 'Free text', 100, 0]];
 assert.equal(dailyLog(rows, [], false)[0].scores.actualPerformance, 0);
 assert.equal(dailyLog(rows, [], false)[0].status, 'in-progress');
 const long = [['Date', 'Exercise', 'Set', 'Unit', 'Target', 'Result', 'Expected performance', 'Actual performance'], ['2026-10-26', 'Run', 1, 'm', 100, 90, 100, 90]];
 assert.equal(dailyLog(long, [], false)[0].scores.actualPerformance, 90);
});

test('scoring workbook imports saved formulas, no invented actuals, and rebases linked Scoring dates', async () => {
 const bytes = new Uint8Array(readFileSync('templates/Training-example.xlsx'));
 const plan = await parseWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
 assert.equal(plan.sessions[0].scores.expectedPerformance, 100);
 assert.equal(plan.sessions[0].scores.actualPerformance, null);
 assert.equal(plan.sessions[0].scores.plannedIntensity, null);
 assert.equal(plan.sessions[0].scores.effortRating, null);
 assert.equal(plan.sessions[0].scores.plannedMetrics, 4);
 assert.equal(plan.sessions[0].scores.scoredMetrics, 0);
 const rebased = new Uint8Array(startTemplateNextMonday(bytes, new Date(2027, 0, 1, 12)));
 const files = unzipSync(rebased);
 const scoring = strFromU8(files['xl/worksheets/sheet4.xml']);
 const log = strFromU8(files['xl/worksheets/sheet3.xml']);
 const cellValue = (xml, address) => xml.match(new RegExp(`<(?:(?:\\w+):)?c\\b(?![^>]*\\/>)[^>]*r="${address}"[^>]*>[\\s\\S]*?<\\/(?:(?:\\w+):)?c>`))?.[0].match(/<(?:\w+:)?v>([^<]+)<\/(?:\w+:)?v>/)?.[1];
 assert.equal(cellValue(scoring, 'A5'), cellValue(log, 'A3'));
 // Import cached zero results from the selected Daily sheet; unrelated Scoring is not an importer role.
 let xml = log;
 for (const address of ['AI3']) xml = xml.replace(new RegExp(`<((?:\\w+:)?)c\\b[^>]*r="${address}"[^>]*>[\\s\\S]*?<\\/\\1c>`), (_, p) => `<${p}c r="${address}"><${p}v>0</${p}v></${p}c>`);
 files['xl/worksheets/sheet3.xml'] = strToU8(xml);
 const recorded = await parseWorkbook(zipSync(files).buffer);
 assert.equal(recorded.sessions[0].scores.actualPerformance, 0);
 assert.equal(recorded.sessions[0].scores.effortRating, null);
});

test('analytics pages separate their content and graph preserves missing values without plotting zeros', () => {
 const plan = { parts: [], sessions: [{ date: '2026-10-26', title: 'Training', result: '', status: 'planned', notes: '', sport: 'training', plannedMinutes: 30, actualMinutes: null, scores: { expectedPerformance: 100, actualPerformance: null, plannedIntensity: 3, effortRating: null, scoredMetrics: 0, plannedMetrics: 3 } }] };
 const pages = analyticsNoteTasks(plan, 'Custom sports');
 assert.deepEqual(pages.map(page => page.path), ['Analytics/Index.md', 'Analytics/Table.md', 'Analytics/Daily.md', 'Analytics/Graph.md']);
 const graph = analyticsGraphMarkdown(plan, 'Custom sports');
 assert.ok(graph.includes('2026-10-26\t100\t—'));
 assert.ok(graph.includes('2026-10-26\t3\t—'));
 assert.ok(graph.includes('Planned intensity\tFelt effort (optional)'));
 assert.ok(!graph.includes('minutes × RPE'));
 assert.ok(graph.includes('0 / 3'));
 assert.ok(pages[0].body.includes('[[Custom sports/Analytics/Graph|Graph]]'));
});

class Element {
 constructor(tag = 'div', options = {}) { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = options.text; this.namespaceURI = 'http://www.w3.org/2000/svg'; }
 createDiv(options) { return this.createEl('div', options); }
 createEl(tag, options) { const child = new Element(tag, options); this.children.push(child); return child; }
 createSvg(tag) { return this.createEl(tag); }
 setAttribute(key, value) { this.attributes[key] = value; }
 appendChild(child) { this.children.push(child); }
}
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
  assert.equal(ratingPoints[0].attributes.cy, '122.5');
  assert.equal(ratingPoints[1].attributes.cy, '35');
  const empty = new Element(); render('Date\tExpected\tActual\n2026-10-26\t—\t—', empty);
  assert.ok(empty.children[0].textContent.includes('No values recorded'));
  const invalid = new Element(); render('Date\tExpected\tActual\n<script>\t100\tNaN', invalid);
  assert.equal(invalid.children[0].tag, 'pre');
 } finally { globalThis.document = previous; }
});
