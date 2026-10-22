import type { Plugin } from 'obsidian';

export function registerScoreCharts(plugin: Plugin): void {
 plugin.registerMarkdownCodeBlockProcessor('sports-trend', (source, element) => {
  const lines = source.trim().split('\n');
  const headers = lines.shift()?.split('\t') ?? [];
  if (headers.length !== 3 || headers[0] !== 'Date' || headers.slice(1).some(label => !label.trim())) { element.createEl('pre', { text: source }); return; }
  const rows = lines.filter(Boolean).map(line => line.split('\t'));
  if (rows.some(row => row.length !== 3 || !/^\d{4}-\d{2}-\d{2}$/.test(row[0]!) || !Number.isFinite(Date.parse(`${row[0]}T12:00:00Z`)) || row.slice(1).some(value => value !== '—' && (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))))) { element.createEl('pre', { text: source }); return; }
  const values = rows.flatMap(row => row.slice(1).filter(value => value !== '—').map(Number));
  if (!values.length) { element.createEl('p', { text: 'No values recorded for this chart yet. Leave optional ratings blank, or enter values in the workbook, save, then sync.' }); return; }
  const root = element.createDiv({ cls: 'sports-score-chart' });
  root.createEl('p', { text: `${headers[1]}: dashed · ${headers[2]}: solid · missing values leave gaps`, cls: 'sports-performance-legend' });
  const svg = root.createSvg('svg');
  svg.setAttribute('viewBox', '0 0 720 260'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${headers[1]} versus ${headers[2]} for ${rows.length} dates. Values are in the table below.`);
  const ratingScale = headers[1] === 'Planned intensity';
  const minimum = ratingScale ? 1 : 0;
  const max = ratingScale ? 5 : values.reduce((maximum, value) => Math.max(maximum, value), 1);
  const dates = rows.map(row => Date.parse(`${row[0]}T12:00:00Z`));
  const first = Math.min(...dates), last = Math.max(...dates);
  const x = (index: number): number => last === first ? 370 : 50 + (dates[index]! - first) / (last - first) * 620;
  const y = (value: number): number => 210 - (value - minimum) / (max - minimum) * 175;
  const node = (tag: keyof SVGElementTagNameMap, attributes: Record<string, string>, text?: string): SVGElement => {
   const child = svg.createSvg(tag);
   for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
   if (text) child.textContent = text;
   return child;
  };
  for (const fraction of [0, .5, 1]) {
   const value = minimum + (max - minimum) * fraction;
   node('line', { x1: '50', x2: '670', y1: String(y(value)), y2: String(y(value)), class: 'sports-score-grid' });
   node('text', { x: '43', y: String(y(value) + 4), 'text-anchor': 'end' }, String(Math.round(value * 10) / 10));
  }
  for (const column of [1, 2]) {
   let previous: { x: number; y: number } | null = null;
   rows.forEach((row, index) => {
    if (row[column] === '—') { previous = null; return; }
    const point = { x: x(index), y: y(Number(row[column])) };
    const cls = column === 1 ? 'sports-score-expected' : 'sports-score-actual';
    if (previous) node('line', { x1: String(previous.x), x2: String(point.x), y1: String(previous.y), y2: String(point.y), class: cls });
    const circle = node('circle', { cx: String(point.x), cy: String(point.y), r: column === 1 ? '4' : '3', class: cls });
    const title = document.createElementNS(svg.namespaceURI, 'title');
    title.textContent = `${row[0]} · ${headers[column]}: ${row[column]}`; circle.appendChild(title);
    previous = point;
   });
  }
  const labels = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
  for (const index of labels) node('text', { x: String(x(index)), y: '238', 'text-anchor': 'middle' }, rows[index]![0]);
 });
}
