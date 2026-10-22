import type { Plugin } from 'obsidian';

interface Point { label: string; x: number; y: number }

/** Pearson correlation is unavailable for too few points or a constant axis. */
export function correlation(points: { x: number; y: number }[]): number | null {
 if (points.length < 3) return null;
 const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
 const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
 let xy = 0, xx = 0, yy = 0;
 for (const point of points) { const x = point.x - meanX, y = point.y - meanY; xy += x * y; xx += x * x; yy += y * y; }
 return xx && yy ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null;
}

export function registerScoreScatter(plugin: Plugin): void {
 plugin.registerMarkdownCodeBlockProcessor('sports-scatter', (source, element) => {
  const lines = source.trim().split('\n');
  const headers = lines.shift()?.split('\t');
  const effort = headers?.[2] === 'Felt effort (1–5)';
  const rows = lines.filter(Boolean).map(line => line.split('\t'));
  if (headers?.length !== 3 || headers[0] !== 'Session' || headers[1] !== 'Planned intensity (0–10)' || (!effort && headers[2] !== 'Performance (%)') || rows.some(row => row.length !== 3 || !row[0] || row.slice(1).some((v, i) => !(i === 1 && v === '—') && (!/^\d+(?:\.\d+)?$/.test(v) || !Number.isFinite(Number(v)))) || Number(row[1]) > 10 || (effort && row[2] !== '—' && (Number(row[2]) < 1 || Number(row[2]) > 5)))) {
   element.createEl('pre', { text: source }); return;
  }
  const points: Point[] = rows.filter(row => row[2] !== '—').map(row => ({ label: row[0]!, x: Number(row[1]), y: Number(row[2]) }));
  const intensityOnly = rows.filter(row => row[2] === '—');
  if (!rows.length) { element.createEl('p', { text: 'Record planned intensity for a session to see this comparison.' }); return; }
  const root = element.createDiv({ cls: 'sports-score-chart' });
  const r = correlation(points);
  root.createEl('p', { text: `${points.length} paired sessions${intensityOnly.length ? ` · ${intensityOnly.length} intensity only` : ''} · ${r === null ? 'Correlation needs at least 3 pairs with variation on both axes.' : `Pearson r = ${r.toFixed(2)} (−1 inverse, 0 no linear relationship, +1 positive).`}` });
  const svg = root.createSvg('svg');
  svg.setAttribute('viewBox', `0 0 720 ${intensityOnly.length ? 350 : 300}`); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${headers[2]} against planned intensity, ${points.length} paired sessions, ${intensityOnly.length} intensity-only sessions. Each point identifies its session and values.`);
  const node = (tag: keyof SVGElementTagNameMap, attributes: Record<string, string>, text?: string): SVGElement => {
   const child = svg.createSvg(tag);
   for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
   if (text) child.textContent = text;
   return child;
  };
  const minY = effort ? 1 : 0;
  const maxY = effort ? 5 : Math.ceil(points.reduce((max, p) => Math.max(max, p.y), 100) / 25) * 25;
  const x = (value: number): number => 65 + value / 10 * 600;
  const y = (value: number): number => 230 - (value - minY) / (maxY - minY) * 195;
  for (const fraction of [0, .25, .5, .75, 1]) {
   const value = minY + (maxY - minY) * fraction;
   node('line', { x1: '65', x2: '665', y1: String(y(value)), y2: String(y(value)), class: 'sports-score-grid' });
   node('text', { x: '56', y: String(y(value) + 4), 'text-anchor': 'end' }, String(Math.round(value * 10) / 10));
   node('text', { x: String(x(fraction * 10)), y: '251', 'text-anchor': 'middle' }, String(fraction * 10));
  }
  node('text', { x: '365', y: '280', 'text-anchor': 'middle' }, headers[1]);
  node('text', { x: '65', y: '19' }, headers[2]);
  if (!effort) node('line', { x1: '65', x2: '665', y1: String(y(100)), y2: String(y(100)), class: 'sports-score-expected' });
  for (const point of points) {
   const circle = node('circle', { cx: String(x(point.x)), cy: String(y(point.y)), r: '5', class: 'sports-score-actual', opacity: '0.65', tabindex: '0' });
   const label = `${point.label} · intensity: ${point.x}/10 · ${headers[2]}: ${point.y}`;
   circle.setAttribute('aria-label', label);
   const title = document.createElementNS(svg.namespaceURI, 'title'); title.textContent = label; circle.appendChild(title);
  }
  if (intensityOnly.length) {
   node('line', { x1: '65', x2: '665', y1: '307', y2: '307', class: 'sports-score-grid' });
   node('text', { x: '365', y: '334', 'text-anchor': 'middle' }, `Intensity only · ${effort ? 'felt effort unrecorded' : 'performance missing or incomplete'}`);
   for (const row of intensityOnly) {
    const label = `${row[0]} · intensity: ${row[1]}/10 · ${headers[2]} unavailable`;
    const mark = node('line', { x1: String(x(Number(row[1]))), x2: String(x(Number(row[1]))), y1: '300', y2: '314', class: 'sports-score-expected', tabindex: '0', 'aria-label': label });
    const title = document.createElementNS(svg.namespaceURI, 'title'); title.textContent = label; mark.appendChild(title);
   }
  }
 });
}
