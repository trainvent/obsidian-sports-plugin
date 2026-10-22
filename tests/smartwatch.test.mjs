import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-watch-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
async function load(path) {
 const output = await build({ entryPoints: [`src/${path}.ts`], bundle: true, platform: 'node', format: 'cjs', write: false });
 const target = `${temp}/${path.replaceAll('/', '-')}.cjs`; writeFileSync(target, output.outputFiles[0].text); return require(target);
}
const { smartwatchCharts } = await load('model/smartwatch');
const { smartwatchMarkdown } = await load('notes/smartwatch');
const { registerSmartwatchCharts } = await load('ui/smartwatch-chart');
const activity = (id, date, type, duration, distance, average_hr, time = '08:00') => ({ id, date, time, type, name: type, duration, distance, average_hr });
const cache = { start: '2026-12-28', end: '2027-01-24', lastSuccess: '2027-01-24T12:00:00Z', activities: [
 activity('1', '2026-12-28', 'running', 1800, 5000, 150),
 activity('2', '2026-12-28', 'trail_running', 600, 1000, null, '18:00'),
 activity('3', '2027-01-04', 'lap_swimming', 1200, 1000, 130),
 activity('4', '2027-01-11', 'running', null, 1000, 140),
] };

test('smartwatch totals use Monday weeks across year boundaries, deduplicate IDs, and preserve empty weeks', () => {
 const data = smartwatchCharts({ ...cache, activities: [...cache.activities, cache.activities[0]] });
 assert.deepEqual(data.volume.groups, ['Running', 'Swimming']);
 assert.deepEqual(data.volume.rows, [
  { date: '2026-12-28', values: [40, 0] }, { date: '2027-01-04', values: [0, 20] },
  { date: '2027-01-11', values: [0, 0] }, { date: '2027-01-18', values: [0, 0] },
 ]);
 assert.equal(data.missingDurations, 1);
 assert.equal(data.running.rows.length, 3);
 assert.equal(data.running.rows[0].pace, 360);
 assert.equal(data.running.rows[1].pace, 600);
 assert.equal(data.running.rows[1].hr, null);
 assert.equal(data.running.rows[2].pace, null);
 assert.equal(data.running.rows[2].hr, 140);
 assert.equal(data.swimming.rows[0].pace, 120);
});

test('zero or missing distance/duration never invents pace, and absent heart rate stays absent', () => {
 const data = smartwatchCharts({ activities: [activity('1', '2026-12-28', 'running', 0, 100, 0), activity('2', '2026-12-28', 'running', 60, 0, null)] });
 assert.ok(data.running.rows.every(r => r.pace === null && r.hr === null));
 assert.equal(smartwatchCharts().volume.rows.length, 0);
});

test('smartwatch note contains three chart blocks, cached-source status, and safe activity labels', () => {
 const body = smartwatchMarkdown({ ...cache, error: 'Refresh failed', activities: [{ ...cache.activities[0], name: '```\n<script>bad</script>' }] }, 'My sports');
 assert.equal((body.match(/```sports-watch/g) ?? []).length, 3);
 assert.ok(body.includes('[[My sports/Analytics/Index|Analytics]]'));
 assert.ok(body.includes('Cached activities remain visible'));
 assert.ok(!body.includes('```\\n<script>'));
 assert.ok(body.includes('\\u0060\\u0060\\u0060'));
 assert.ok(!body.includes('| Date |'));
});

class Element {
 constructor(tag = 'div', options = {}) { this.tag = tag; this.children = []; this.attributes = {}; this.textContent = options.text; this.namespaceURI = 'http://www.w3.org/2000/svg'; }
 createEl(tag, options) { const child = new Element(tag, options); this.children.push(child); return child; }
 createDiv(options) { return this.createEl('div', options); }
 createSvg(tag) { return this.createEl(tag); }
 setAttribute(key, value) { this.attributes[key] = value; }
 appendChild(child) { this.children.push(child); }
}
test('watch renderers use independent axes, faster pace higher, missing-series gaps and correct stacked volume', () => {
 let render; registerSmartwatchCharts({ registerMarkdownCodeBlockProcessor: (_, callback) => { render = callback; } });
 const previous = globalThis.document; globalThis.document = { createElementNS: (_, tag) => new Element(tag) };
 try {
  const charts = smartwatchCharts(cache);
  const root = new Element(); render(JSON.stringify(charts.running), root);
  const svg = root.children[0].children[1];
  const pace = svg.children.filter(c => c.tag === 'circle' && c.attributes.class === 'sports-watch-pace');
  const hr = svg.children.filter(c => c.tag === 'circle' && c.attributes.class === 'sports-watch-heart');
  assert.equal(pace.length, 2); assert.equal(hr.length, 2);
  assert.ok(Number(pace[0].attributes.cy) < Number(pace[1].attributes.cy));
  assert.notEqual(pace[0].attributes.cx, pace[1].attributes.cx);
  assert.equal(svg.children.filter(c => c.tag === 'line' && c.attributes.class === 'sports-watch-heart').length, 0);
  const bars = new Element(); render(JSON.stringify(charts.volume), bars);
  assert.equal(bars.children[0].children[1].children.filter(c => c.tag === 'rect').length, 2);
  const empty = new Element(); render(JSON.stringify(smartwatchCharts().running), empty);
  assert.ok(empty.children[0].textContent.includes('No recorded activities'));
  const invalid = new Element(); render('{"kind":"cardio","sport":"running","rows":[{"date":"bad"}]}', invalid);
  assert.equal(invalid.children[0].tag, 'pre');
 } finally { globalThis.document = previous; }
});
