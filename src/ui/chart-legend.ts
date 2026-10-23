/** Use the series' own SVG class so legend samples always match the chart. */
export function chartLegend(root: HTMLElement, series: { label: string; cls: string }[], note: string): void {
 const legend = root.createDiv( { cls: 'sports-performance-legend sports-chart-legend' });
 for (const item of series) {
  const entry = legend.createSpan( { cls: 'sports-chart-legend-item' });
  const sample = entry.createSvg('svg');
  sample.setAttribute('viewBox', '0 0 40 12');
  sample.setAttribute('aria-hidden', 'true');
  sample.setAttribute('class', 'sports-chart-legend-sample');
  const line = sample.createSvg('line');
  for (const [key, value] of Object.entries({ x1: '2', x2: '38', y1: '6', y2: '6', class: item.cls })) line.setAttribute(key, value);
  entry.createSpan( { text: item.label });
 }
 legend.createSpan( { text: note });
}
