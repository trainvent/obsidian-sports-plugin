import type { Plugin } from 'obsidian';
import { chartLegend } from './chart-legend';
import { registerScoreScatter } from './score-scatter';
import { registerSmartwatchCharts } from './smartwatch-chart';

export function registerScoreCharts(plugin: Plugin): void {
 registerScoreScatter(plugin);
 registerSmartwatchCharts(plugin);
 plugin.registerMarkdownCodeBlockProcessor('sports-trend', (source, element) => {
  const lines = source.trim().split('\n');
  let headers = lines.shift()?.split('\t') ?? [];
  const performanceOnly = headers.length === 2 && headers[1] === 'Performance (%)';
  if ((!performanceOnly && headers.length !== 3) || headers[0] !== 'Date' || headers.slice(1).some(label => !label.trim())) { element.createEl('pre', { text: source }); return; }
  const inputRows = lines.filter(Boolean).map(line => line.split('\t'));
  if (performanceOnly && inputRows.some(row => row.length !== 2)) { element.createEl('pre', { text: source }); return; }
  const rows = performanceOnly ? inputRows.map(row => [row[0]!, '—', row[1]!]) : inputRows;
  if (performanceOnly) headers = ['Date', '', 'Performance (%)'];
  if (rows.some(row => row.length !== 3 || !/^\d{4}-\d{2}-\d{2}$/.test(row[0]!) || !Number.isFinite(Date.parse(`${row[0]}T12:00:00Z`)) || row.slice(1).some(value => value !== '—' && (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))))) { element.createEl('pre', { text: source }); return; }
  const values = rows.flatMap(row => row.slice(1).filter(value => value !== '—').map(Number));
  if (!values.length && !performanceOnly) { element.createEl('p', { text: 'No values recorded for this chart yet. Leave optional ratings blank, or enter values in the workbook, save, then sync.' }); return; }
  const root = element.createDiv({ cls: 'sports-score-chart' });
  const ratingScale = headers[1] === 'Planned intensity';
  const scaledPerformance = headers[1] === 'Performance × intensity';
  const watchAxes = headers[1] === 'Planned intensity (0–10)' && headers[2] === 'Watch heart rate (bpm)';
  const zoneComparison = headers[2] === 'Watch HR zone (1–5)';
  const dualAxis = watchAxes || headers[2] === 'Planned intensity (0–10)' && ['Felt effort (1–5)', 'Performance (%)'].includes(headers[1]!);
  chartLegend(root, performanceOnly ? [{ label: 'Actual performance (0–200%)', cls: 'sports-score-actual' }] : [
   { label: `${headers[1]}${ratingScale ? ' (0–10)' : ''}${dualAxis ? ' (left axis)' : ''}`, cls: 'sports-score-expected' },
   { label: `${headers[2]}${ratingScale ? ' (1–5)' : ''}${dualAxis ? ' (right axis)' : ''}`, cls: 'sports-score-actual' },
  ], `${values.length ? 'Missing values leave gaps' : 'No results recorded yet'}${performanceOnly && values.some(value => value > 200) ? ' · values above 200% marked at the top; point labels retain actual values' : ''}`);
  const svg = root.createSvg('svg');
  svg.setAttribute('viewBox', '0 0 720 260'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${performanceOnly ? 'Actual performance on a 0–200% scale' : `${headers[1]} versus ${headers[2]}`} for ${rows.length} dates. Point labels contain dates and values.`);
  const minimum = zoneComparison ? 1 : 0;
  const leftValues = dualAxis ? rows.filter(row => row[1] !== '—').map(row => Number(row[1])) : values;
  const rightMax = watchAxes ? rows.reduce((maximum, row) => row[2] === '—' ? maximum : Math.max(maximum, Math.ceil(Number(row[2]) / 10) * 10), 200) : 10;
  const max = zoneComparison ? 5 : watchAxes ? 10 : performanceOnly ? 200 : dualAxis && headers[1] === 'Felt effort (1–5)' ? 5 : ratingScale ? 10 : leftValues.reduce((maximum, value) => Math.max(maximum, value), scaledPerformance ? 10 : dualAxis ? 100 : 1);
  const dates = rows.map(row => Date.parse(`${row[0]}T12:00:00Z`));
  const first = dates.length ? Math.min(...dates) : 0, last = dates.length ? Math.max(...dates) : 0;
  const x = (index: number): number => last === first ? 370 : 50 + (dates[index]! - first) / (last - first) * 620;
  const y = (value: number, column = 1): number => 210 - ((performanceOnly ? Math.min(200, value) : value) - minimum) / ((dualAxis && column === 2 ? rightMax : max) - minimum) * 175;
  const node = (tag: keyof SVGElementTagNameMap, attributes: Record<string, string>, text?: string): SVGElement => {
   const child = svg.createSvg(tag);
   for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
   if (text) child.textContent = text;
   return child;
  };
  for (const fraction of [0, .5, 1]) {
   const value = minimum + (max - minimum) * fraction;
   node('line', { x1: '50', x2: '670', y1: String(y(value)), y2: String(y(value)), class: 'sports-score-grid' });
   node('text', { x: '43', y: String(y(value) + 4), 'text-anchor': 'end' }, `${Math.round(value * 10) / 10}${performanceOnly ? '%' : ''}`);
   if (dualAxis) node('text', { x: '680', y: String(y(value) + 4), 'text-anchor': 'start' }, String(rightMax * fraction));
  }
  if (dualAxis) {
   node('text', { x: '50', y: '19' }, headers[1]);
   node('text', { x: '670', y: '19', 'text-anchor': 'end' }, headers[2]);
  }
  for (const column of [1, 2]) {
   let previous: { x: number; y: number } | null = null;
   rows.forEach((row, index) => {
    if (row[column] === '—') { previous = null; return; }
    const point = { x: x(index), y: y(Number(row[column]), column) };
    const cls = column === 1 ? 'sports-score-expected' : 'sports-score-actual';
    if (previous) node('line', { x1: String(previous.x), x2: String(point.x), y1: String(previous.y), y2: String(point.y), class: cls });
    const circle = node('circle', { cx: String(point.x), cy: String(point.y), r: column === 1 ? '4' : '3', class: cls });
    if (performanceOnly && Number(row[column]) > 200) node('text', { x: String(point.x), y: '30', 'text-anchor': 'middle' }, '↑');
    const title = document.createElementNS(svg.namespaceURI, 'title');
    title.textContent = `${row[0]} · ${headers[column]}: ${row[column]}`; circle.appendChild(title);
    previous = point;
   });
  }
  const labels = rows.length ? [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])] : [];
  for (const index of labels) node('text', { x: String(x(index)), y: '238', 'text-anchor': 'middle' }, rows[index]![0]);
 });
}
