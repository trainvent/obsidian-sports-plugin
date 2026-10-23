import type { Plugin } from 'obsidian';
import { chartLegend } from './chart-legend';
import { exerciseChartData, chartCeiling, timeChartCeiling, timeLabel, type ExercisePoint } from './exercise-chart-data';

export function registerPerformanceCharts(plugin: Plugin): void {
 plugin.registerMarkdownCodeBlockProcessor('sports-compare', renderPerformanceChart);
}

export function renderPerformanceChart(source: string, element: HTMLElement): void {
 const points = exerciseChartData(source);
 if (!points) { element.createEl('pre', { text: source }); return; }
 if (!points.length) { element.createEl('p', { text: 'No exercise targets or results yet.' }); return; }
 const container = element.createDiv({ cls: 'sports-performance sports-score-chart' });
 chartLegend(container, [
  { label: 'Plan', cls: 'sports-compare-plan', shape: 'pipe' },
  { label: 'Result', cls: 'sports-compare-result', shape: 'pipe' },
 ], '');
 const shared = points.filter(point => point.axis !== 'other');
 if (shared.length) renderExercisePlot(shared, container);
 for (const unit of new Set(points.filter(point => point.axis === 'other').map(point => point.unit))) {
  renderExercisePlot(points.filter(point => point.axis === 'other' && point.unit === unit), container, unit);
 }
}

function renderExercisePlot(points: ExercisePoint[], container: HTMLElement, unit?: string): void {
 const width = Math.max(600, points.length * 125 + 120), left = 62, right = width - 72;
 const top = 36, bottom = 184;
 const countCeiling = chartCeiling(points.filter(point => point.axis !== 'time').flatMap(point => [point.plan, point.result]));
 const timeCeiling = timeChartCeiling(points.filter(point => point.axis === 'time').flatMap(point => [point.plan, point.result]));
 const hasTime = points.some(point => point.axis === 'time'), hasCount = points.some(point => point.axis !== 'time');
 const wrapper = container.createDiv({ cls: 'sports-exercise-plot' });
 const svg = wrapper.createSvg('svg');
 svg.setAttribute('viewBox', `0 0 ${width} 274`);
 svg.setAttribute('style', `min-width: ${width}px`);
 svg.setAttribute('role', 'img');
 svg.setAttribute('aria-label', unit ? `Exercise plan and recorded results in ${unit}.` : 'Exercise plan and recorded results. Repetition counts on the left; time on the right. Purple outlines show planned targets; green bars show recorded results. Labels contain values and units.');
 const node = (tag: keyof SVGElementTagNameMap, attributes: Record<string, string>, text?: string): SVGElement => {
  const child = svg.createSvg(tag);
  for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
  if (text !== undefined) child.textContent = text;
  return child;
 };
 const y = (value: number, point: ExercisePoint): number => bottom - value / (point.axis === 'time' ? timeCeiling : countCeiling) * (bottom - top);
 const countLabel = unit || (points.some(point => /^round/.test(point.unit)) ? 'Reps / rounds' : 'Reps');
 if (hasCount) node('text', { x: String(left), y: '17', class: 'sports-compare-axis' }, countLabel);
 if (hasTime) node('text', { x: String(right), y: '17', 'text-anchor': 'end', class: 'sports-compare-axis' }, 'Time (min:ss)');
 for (const fraction of [0, .5, 1]) {
  const height = bottom - fraction * (bottom - top);
  node('line', { x1: String(left), x2: String(right), y1: String(height), y2: String(height), class: 'sports-score-grid' });
  if (hasCount) node('text', { x: String(left - 12), y: String(height + 4), 'text-anchor': 'end' }, String(countCeiling * fraction));
  if (hasTime) node('text', { x: String(right + 12), y: String(height + 4) }, timeLabel(timeCeiling * fraction));
 }
 points.forEach((point, index) => {
  const x = left + (index + .5) / points.length * (right - left);
  // Draw the fill first, then its target outline so both remain visible at 100%.
  for (const metric of ['result', 'plan'] as const) {
   const value = point[metric];
   if (value === null) continue;
   const width = 30;
   const height = bottom - y(value, point);
   // A thin foot marks an explicitly recorded zero; missing values get no mark.
   const markTop = height === 0 ? bottom - 1 : y(value, point);
   const markBottom = height === 0 ? bottom + 1 : bottom;
   const mark = metric === 'plan'
    ? node('path', { d: `M ${x - width / 2} ${markTop} V ${markBottom} M ${x + width / 2} ${markTop} V ${markBottom}`, class: 'sports-compare-plan', tabindex: '0' })
    : node('rect', { x: String(x - width / 2), y: String(markTop), width: String(width), height: String(height === 0 ? 2 : height), class: 'sports-compare-result', tabindex: '0' });
   const description = `${point.label} · ${metric === 'plan' ? 'Plan' : 'Result'}: ${point.axis === 'time' ? timeLabel(value) : Math.round(value * 100) / 100} ${point.axis === 'time' ? '(min:ss)' : point.unit}`;
   mark.setAttribute('aria-label', description);
   const title = mark.createSvg('title'); title.textContent = description;
  }
  const words = point.label.split(/\s+/), labels: string[] = [];
  for (const word of words) {
   if (!labels.length || `${labels.at(-1)} ${word}`.length > 18) labels.push(word);
   else labels[labels.length - 1] += ` ${word}`;
  }
  // Three lines keep the chart compact; the complete name remains on hover/focus.
  labels.slice(0, 3).forEach((label, row) => node('text', { x: String(x), y: String(bottom + 24 + row * 15), 'text-anchor': 'middle' }, row === 2 && labels.length > 3 ? `${label}…` : label));

 });
}
