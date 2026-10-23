import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const temp = mkdtempSync(`${tmpdir()}/sports-dashboard-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const result = await build({ stdin: { contents: "export { SportsDashboard } from './src/ui/dashboard'; export { registerTodayWidget } from './src/ui/today-widget';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', write: false, loader: { '.svg': 'text' },
 plugins: [{ name: 'obsidian', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'mock' }));
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `export class ItemView {} export class MarkdownRenderChild { constructor(el) {this.containerEl=el; this.intervals=[];} registerInterval(id) {this.intervals.push(id);} unload() {for(const id of this.intervals) window.clearInterval(id);this.onunload();} }` }));
 } }],
});
writeFileSync(`${temp}/dashboard.mjs`, result.outputFiles[0].text);
// eslint-disable-next-line no-unsanitized/method -- Imports our own esbuild output from a private temporary directory.
const { SportsDashboard, registerTodayWidget } = await import(pathToFileURL(`${temp}/dashboard.mjs`).href);
class Element {
 constructor(tag, options = {}) { this.tag = tag; this.text = options.text ?? ''; this.cls = options.cls ?? ''; this.children = []; this.handlers = {}; }
 createEl(tag, options) { const child = new Element(tag, options); this.children.push(child); return child; }
 createDiv(options) { return this.createEl('div', options); }
 createSpan(options) { return this.createEl('span', options); }
 addClass(...classes) { this.cls += ` ${classes.join(' ')}`; }
 addEventListener(name, fn) { this.handlers[name] = fn; }
 setAttribute() {}
 empty() { this.children = []; }
 scrollIntoView(options) { this.scrolled = options; }
 all() { return [this, ...this.children.flatMap(child => child.all())]; }
}
test('dashboard shows six days, navigates by day, and keeps weekly note tied to the anchor', () => {
 const opened = [];
 const plugin = { data: { plan: { name: 'Training', sessions: [], parts: [] }, garminCache: { lastSuccess: 'SECRET-TIMESTAMP', activities: [], error: '' } }, openWeekly: date => opened.push(new Date(date)) };
 const view = new SportsDashboard({}, plugin);
 view.contentEl = new Element('root');
 view.anchor = new Date(2026, 11, 30, 12);
 view.render();
 const find = label => view.contentEl.all().find(node => node.tag === 'button' && node.text === label);
 const days = () => view.contentEl.all().filter(node => node.cls.split(' ').includes('sports-day'));
 assert.equal(days().length, 6);
 const reviewButton = find('Reflect on the week');
 assert.ok(reviewButton);
 reviewButton.handlers.click();
 assert.equal(opened[0].getDay(), 0);
 assert.equal(opened[0].getDate(), 3);
 opened.length = 0;
 assert.ok(days()[0].all().some(node => node.text.includes('30')));
 assert.ok(days()[5].all().some(node => node.text.includes('4')));
 assert.ok(!view.contentEl.all().some(node => node.text.includes('SECRET-TIMESTAMP')));
 find('Next →').handlers.click();
 assert.equal(view.anchor.getDate(), 31);
 find('Open weekly note').handlers.click();
 assert.equal(opened[0].getDate(), 31);
 find('← Previous').handlers.click();
 assert.equal(view.anchor.getDate(), 30);
 const previousWindow = globalThis.window;
 globalThis.window = { matchMedia: () => ({ matches: true }) };
 try {
  const dayButton = view.contentEl.all().find(node => node.cls === 'sports-dash-day-button');
  dayButton.handlers.click();
  assert.equal(days()[0].scrolled.behavior, 'auto');
 } finally { globalThis.window = previousWindow; }
});


test('today widget refreshes cached data, rolls over, and releases timers on close', () => {
 const RealDate = globalThis.Date, previousWindow = globalThis.window;
 let now = new RealDate(2026, 9, 25, 12), tick;
 const intervals = new Set();
 globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])); } };
 globalThis.window = { setInterval(fn) { tick = fn; intervals.add(1); return 1; }, clearInterval(id) { intervals.delete(id); } };
 try {
  let processor, cleanup, child;
  const opened = [];
  const plugin = { data: { plan: { sessions: [], parts: [], weeklySchedule: [{ weekday: 0, time: '10:30', title: 'Weekly run', minutes: 60, recordedBy: 'Tracker', notes: '' }] }, showRegularActivities: true },
   registerMarkdownCodeBlockProcessor(name, callback) { assert.equal(name, 'sports-today'); processor = callback; }, register(fn) { cleanup = fn; }, openWeekly(...args) { opened.push(args); } };
  const refresh = registerTodayWidget(plugin);
  const root = new Element('root');
  processor('', root, { addChild(value) { child = value; value.onload(); } });
  const texts = () => root.all().map(el => el.text).join(' ');
  const button = label => root.all().find(el => el.tag === 'button' && el.text === label);
  assert.ok(texts().includes('Weekly run'));
  button('Reflect on the week').handlers.click();
  assert.equal(opened[0][1], true);
  plugin.data.showRegularActivities = false; refresh();
  assert.ok(!texts().includes('Weekly run'));
  now = new RealDate(2026, 9, 26, 12); tick();
  assert.ok(!button('Reflect on the week'));
  button('Open weekly note').handlers.click();
  assert.equal(opened[1][0].getDate(), 26);
  child.unload();
  assert.equal(intervals.size, 0);
  refresh(); assert.equal(root.children.length, 0);
  cleanup();
 } finally { globalThis.Date = RealDate; globalThis.window = previousWindow; }
});
