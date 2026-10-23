import type { Plugin } from 'obsidian';
import { chartLegend } from './chart-legend';
import type { WatchChart } from '../model/smartwatch';

const COLORS = ['#4C9EC9', '#71B59B', '#D6A45B', '#AF92CE', '#D67E88', '#8795A8'];
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
function valid(value: unknown): value is WatchChart {
 if (!value || typeof value !== 'object') return false;
 const c = value as WatchChart;
 if (!Array.isArray(c.rows) || c.rows.length > 50_000) return false;
 if (c.kind === 'volume') return Array.isArray(c.groups) && c.groups.length <= 6 && c.groups.every(g => typeof g === 'string') && c.rows.every(r => r && date(r.date) && Array.isArray(r.values) && r.values.length === c.groups.length && r.values.every(numeric));
 return c.kind === 'cardio' && ['running', 'swimming'].includes(c.sport) && c.rows.every(r => r && date(r.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) && typeof r.name === 'string' && (r.pace === null || (numeric(r.pace) && r.pace > 0)) && (r.zone === null || (numeric(r.zone) && r.zone >= 1 && r.zone <= 5)));
}
function paceLabel(seconds: number): string {
 const rounded = Math.round(seconds); return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

export function registerSmartwatchCharts(plugin: Plugin): void {
 plugin.registerMarkdownCodeBlockProcessor('sports-watch', (source, element) => {
  let data: unknown;
  try { data = JSON.parse(source); } catch { element.createEl('pre', { text: source }); return; }
  if (!valid(data)) { element.createEl('pre', { text: source }); return; }
  if (!data.rows.length) { element.createEl('p', { text: 'No recorded activities for this chart yet. Sync Garmin to add data.' }); return; }
  const root = element.createDiv({ cls: 'sports-score-chart sports-smartwatch-chart' });
  if (data.kind === 'volume') root.createEl('p', { text: 'Recorded minutes · stacked by sport', cls: 'sports-performance-legend' });
  else chartLegend(root, [
   { label: 'Pace · left axis (faster higher)', cls: 'sports-watch-pace' },
   { label: 'Average HR zone · right axis', cls: 'sports-watch-heart' },
  ], 'Missing measurements leave gaps');
  const svg = root.createSvg('svg'); svg.setAttribute('viewBox', data.kind === 'volume' ? '0 0 820 340' : '0 0 820 310'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', data.kind === 'volume' ? 'Weekly recorded training minutes, stacked by sport.' : `${data.sport} pace and average HR zone over time. Point labels identify each activity and its measurements.`);
  const node = (tag: keyof SVGElementTagNameMap, attributes: Record<string, string>, text?: string): SVGElement => {
   const child = svg.createSvg(tag); for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
   if (text) child.textContent = text; return child;
  };
  const title = (parent: SVGElement, text: string): void => { const child = document.createElementNS(svg.namespaceURI, 'title'); child.textContent = text; parent.appendChild(child); parent.setAttribute('aria-label', text); };
  const dates = data.rows.map(r => r.date);
  if (data.kind === 'volume') {
   const max = Math.max(1, ...data.rows.map(r => r.values.reduce((sum, v) => sum + v, 0)));
   const ceiling = Math.ceil(max / 30) * 30;
   data.groups.forEach((group, i) => { node('circle', { cx: String(80 + i % 3 * 240), cy: String(20 + Math.floor(i / 3) * 22), r: '5', fill: COLORS[i]! }); node('text', { x: String(92 + i % 3 * 240), y: String(24 + Math.floor(i / 3) * 22) }, group); });
   for (const f of [0, .5, 1]) {
    const y = 260 - f * 185;
    node('line', { x1: '75', x2: '745', y1: String(y), y2: String(y), class: 'sports-score-grid' });
    node('text', { x: '65', y: String(y + 4), 'text-anchor': 'end' }, `${Math.round(ceiling * f)} min`);
   }
   const width = Math.min(40, 670 / data.rows.length * .7);
   data.rows.forEach((row, i) => {
    let sum = 0;
    row.values.forEach((minutes, group) => {
     const height = minutes / ceiling * 185;
     if (minutes > 0) {
      const rect = node('rect', { x: String(75 + (i + .5) / data.rows.length * 670 - width / 2), y: String(260 - sum / ceiling * 185 - height), width: String(width), height: String(height), rx: '2', fill: COLORS[group]!, tabindex: '0' });
      title(rect, `Week of ${row.date} · ${data.groups[group]}: ${minutes.toFixed(1)} min`);
     }
     sum += minutes;
    });
   });
   for (const i of [...new Set([0, Math.floor((dates.length - 1) / 2), dates.length - 1])]) node('text', { x: String(75 + (i + .5) / dates.length * 670), y: '285', 'text-anchor': 'middle' }, dates[i]);
   node('text', { x: '410', y: '315', 'text-anchor': 'middle' }, 'Week starting');
   return;
  }
  const paces = data.rows.flatMap(r => r.pace === null ? [] : [r.pace]);
  const pMin = paces.length ? Math.max(0, Math.floor(Math.min(...paces) / 30) * 30 - 30) : 0;
  const pMax = paces.length ? Math.ceil(Math.max(...paces) / 30) * 30 + 30 : 600;
  const hMin = 1, hMax = 5;
  const times = data.rows.map(r => Date.parse(`${r.date}T${r.time}:00Z`));
  const first = Math.min(...times), last = Math.max(...times);
  const x = (i: number): number => first === last ? 410 : 75 + (times[i]! - first) / (last - first) * 670;
  node('text', { x: '75', y: '20' }, `Pace (min/${data.sport === 'running' ? 'km' : '100 m'})`);
  node('text', { x: '745', y: '20', 'text-anchor': 'end' }, 'Average HR zone (1–5)');
  for (const f of [0, .5, 1]) {
   const y = 250 - f * 200;
   node('line', { x1: '75', x2: '745', y1: String(y), y2: String(y), class: 'sports-score-grid' });
   node('text', { x: '65', y: String(y + 4), 'text-anchor': 'end' }, paceLabel(pMax - f * (pMax - pMin)));
   node('text', { x: '755', y: String(y + 4) }, String(Math.round(hMin + f * (hMax - hMin))));
  }
  for (const metric of ['pace', 'zone'] as const) {
   let previous: { x: number; y: number } | null = null;
   data.rows.forEach((row, i) => {
    const value = row[metric]; if (value === null) { previous = null; return; }
    const point = { x: x(i), y: metric === 'pace' ? 50 + (value - pMin) / (pMax - pMin) * 200 : 250 - (value - hMin) / (hMax - hMin) * 200 };
    const cls = metric === 'pace' ? 'sports-watch-pace' : 'sports-watch-heart';
    if (previous) node('line', { x1: String(previous.x), x2: String(point.x), y1: String(previous.y), y2: String(point.y), class: cls });
    const circle = node('circle', { cx: String(point.x), cy: String(point.y), r: '4', class: cls, tabindex: '0' });
    title(circle, `${row.date} ${row.time} · ${row.name} · ${metric === 'pace' ? `pace ${paceLabel(value)} min/${data.sport === 'running' ? 'km' : '100 m'}` : `average HR zone ${value.toFixed(1)}`}`);
    previous = point;
   });
  }
  for (const i of [...new Set([0, Math.floor((dates.length - 1) / 2), dates.length - 1])]) node('text', { x: String(x(i)), y: '280', 'text-anchor': 'middle' }, dates[i]);
 });
}
