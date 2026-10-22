import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
const temp = mkdtempSync(`${tmpdir()}/sports-performance-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
async function load(path) {
 const result = await build({ entryPoints: [`src/${path}.ts`], bundle: true, platform: 'node', format: 'cjs', write: false });
 const target = `${temp}/${path.replaceAll('/', '-')}.cjs`;
 writeFileSync(target, result.outputFiles[0].text);
 return require(target);
}
const { exerciseTracking } = await load('model/exercise-tracking');
const { performanceMarkdown, sessionDetails, compactResults } = await load('notes/performance');
const { parseWorkbook } = await load('workbook/parse');
const { trainingLogMarkdown, weekMarkdown, datedLogMarkdown } = await load('notes/render');
const { combinedLogMarkdown } = await load('notes/combined-log');
const { registerPerformanceCharts } = await load('ui/performance-chart');
const base = { id: 's', date: '2026-10-20', sport: 'training', title: 'Skills', partId: '', partVersion: '', status: 'in-progress', notes: '', result: '', plannedMinutes: 30, actualMinutes: null,
 prescription: 'A) Pull-up: 3 x 5\nB) Wall hold: 3 x 20 sec\nC) Pistol: 2 x 4/leg\nCore: 5 rounds',
 checks: { 'A done': true, 'B done': true, 'C done': false, 'Core done': true },
 results: { 'A 1 result': '5', 'A 2 result': '3', 'A 3 result': '0', 'B 1 result': '00:20', 'B 2 result': '00:15', 'C 1 result': '4', 'Core rounds result': '0' } };

test('tracking compares explicit targets with recorded reps, times and rounds without mixing units', () => {
 const before = JSON.stringify(base);
 const [a, b, c, core] = exerciseTracking(base);
 assert.deepEqual(a.targets, [5, 5, 5]);
 assert.deepEqual(a.actual, [5, 3, 0]);
 assert.deepEqual(b.actual, [20, 15, null]);
 assert.equal(b.unit, 'seconds');
 assert.equal(c.unit, 'reps/leg');
 assert.deepEqual(c.actual, [null, null]);
 assert.deepEqual(core.actual, [0]);
 const markdown = performanceMarkdown(base);
 for (const text of ['(reps)\t15\t8', '(seconds)\t60\t35', '(reps/leg)\t8\t—', '(rounds)\t5\t0', '35 seconds · partial', '5 / 3 / 0', 'Not recorded (unchecked)']) assert.ok(markdown.includes(text), text);
 assert.equal(JSON.stringify(base), before);
});

test('only unambiguous prescriptions supply targets; extra sets and unsupported actuals remain distinguishable', () => {
 assert.deepEqual(exerciseTracking({ ...base, prescription: 'Try 5 pull-ups and do your best' }), []);
 const exercises = exerciseTracking({ ...base, prescription: 'A) Mobility: 2 min\nB) Hold: 2 × 15 seconds', results: { 'A 1 result': '02:00', 'B 1 result': 'assisted', 'B 3 result': '00:10' } });
 assert.deepEqual(exercises[0].targets, [120]);
 assert.deepEqual(exercises[0].actual, [120]);
 assert.deepEqual(exercises[1].actual, [null, null, 10]);
 assert.ok(performanceMarkdown({ ...base, results: { 'A 1 result': 'assisted' } }).includes('assisted'));
 assert.ok(compactResults({ ...base, results: { 'A 1 result': 'assisted', 'Muscle-up result': '3 assisted' } }).includes('A: recorded; see sets'));
 assert.ok(compactResults({ ...base, results: { 'Muscle-up result': '3 assisted' } }).includes('Muscle-up result: 3 assisted'));
 assert.ok(!compactResults(base).includes('A 1 result'));
 assert.ok(compactResults(base).includes('A: 8 reps'));
 assert.equal(exerciseTracking({ ...base, prescription: 'A) Pull-up: 6 x 5' }).length, 0);
 const unsafe = performanceMarkdown({ ...base, prescription: 'A) <img> | ```name: 3 x 5' });
 assert.ok(unsafe.includes('&lt;img&gt; &#124;'));
 assert.equal(unsafe.split('```sports-compare').length, 2);
});

test('real grouped Daily cells preserve adjusted reps and Excel times through import and rendering', async () => {
 const files = unzipSync(new Uint8Array(readFileSync('templates/Training-example.xlsx')));
 let xml = strFromU8(files['xl/worksheets/sheet3.xml']);
 for (const [address, value, type] of [['H3', '1', 'b'], ['I3', '4', 'n'], ['H5', '1', 'b']]) {
  const pattern = new RegExp(`<((?:\\w+:)?)c\\b[^>]*\\br="${address}"[^>]*>[\\s\\S]*?<\\/\\1c>`);
  const prefix = xml.match(pattern)?.[1];
  assert.notEqual(prefix, undefined);
  xml = xml.replace(pattern, `<${prefix}c r="${address}" t="${type}"><${prefix}v>${value}</${prefix}v></${prefix}c>`);
 }
 files['xl/worksheets/sheet3.xml'] = strToU8(xml);
 const plan = await parseWorkbook(zipSync(files).buffer);
 assert.deepEqual(exerciseTracking(plan.sessions[0])[0].actual, [4, 5, 5]);
 assert.deepEqual(exerciseTracking(plan.sessions[2])[0].actual, [20, 20, 20]);
 const text = trainingLogMarkdown(plan);
 assert.ok(text.includes('(reps)\t15\t14'));
 assert.ok(text.includes('(seconds)\t60\t60'));
 assert.ok(text.includes('| Date | Training and plan | Results | Notes |'));
 assert.ok(text.includes('> [!example]-'));
 assert.ok(!text.includes('| Planned min | Actual min |'));
});

test('graphs reach Log, Plans and weekly notes without corrupting cards when dates are reversed', () => {
 const plan = { timezone: 'Europe/Berlin', parts: [], sessions: [base, { ...base, id: 'next', date: '2026-10-21' }] };
 const now = new Date('2026-10-20T12:00:00Z');
 for (const text of [combinedLogMarkdown(plan, undefined, now), datedLogMarkdown(plan, true, now), weekMarkdown(plan, ['2026-10-20'])]) assert.ok(text.includes('sports-compare'));
 assert.ok(sessionDetails(base).split('\n').every(line => line.startsWith('>')));
 assert.ok(!combinedLogMarkdown(plan, undefined, now).includes('2026-10-21'));
});

class Element {
 constructor(tag = 'div', options = {}) { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = options.text; }
 createDiv(options) { const child = new Element('div', options); this.children.push(child); return child; }
 createEl(tag, options) { const child = new Element(tag, options); this.children.push(child); return child; }
 createSvg(tag) { const child = new Element(tag); child.namespaceURI = 'http://www.w3.org/2000/svg'; this.children.push(child); return child; }
 setAttribute(key, value) { this.attributes[key] = value; }
 appendChild(child) { this.children.push(child); }
}
test('chart renderer provides accessible finite SVG bars and rejects malformed source safely', () => {
 let render;
 registerPerformanceCharts({ registerMarkdownCodeBlockProcessor: (name, callback) => { assert.equal(name, 'sports-compare'); render = callback; } });
 const previous = globalThis.document;
 globalThis.document = { createElementNS: (_, tag) => new Element(tag) };
 try {
  const root = new Element();
  render('Exercise\tPlan\tResult\nPull-up (reps)\t15\t20\nHold (seconds)\t60\t—\nCore\t0\t0', root);
  const svgs = root.children[0].children.slice(1).map(row => row.children[1]);
  assert.equal(svgs.length, 3);
  assert.ok(svgs[1].attributes['aria-label'].includes('unrecorded'));
  assert.ok(svgs[2].attributes['aria-label'].includes('result 0'));
  const bars = svgs.flatMap(svg => svg.children.filter(child => child.tag === 'rect'));
  assert.equal(bars.length, 5);
  for (const bar of bars) assert.ok(Number(bar.attributes.width) >= 0 && Number(bar.attributes.width) <= 280);
  const invalid = new Element();
  render('Exercise\tPlan\tResult\n<script>\tInfinity\t0', invalid);
  assert.equal(invalid.children[0].tag, 'pre');
 } finally { globalThis.document = previous; }
});
