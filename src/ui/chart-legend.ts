/** Use the series' own SVG class so legend samples always match the chart. */
export function chartLegend(root: HTMLElement, series: { label: string; cls: string; shape?: 'pipe' }[], note: string): void {
 const legend = root.createDiv( { cls: 'sports-performance-legend sports-chart-legend' });
 for (const item of series) {
  const entry = legend.createSpan( { cls: 'sports-chart-legend-item' });
  const sample = entry.createSvg('svg');
  sample.setAttribute('viewBox', '0 0 40 12');
  sample.setAttribute('aria-hidden', 'true');
  sample.setAttribute('class', 'sports-chart-legend-sample');
  if (item.shape === 'pipe') {
   const outline = item.cls === 'sports-compare-plan';
   const pipe = sample.createSvg(outline ? 'path' : 'rect');
   const attributes: Record<string, string> = outline ? { d: 'M 10 2 H 30 M 10 10 H 30', class: item.cls } : { x: '10', y: '2', width: '20', height: '8', class: item.cls };
   for (const [key, value] of Object.entries(attributes)) pipe.setAttribute(key, value);
  } else {
   const line = sample.createSvg('line');
   for (const [key, value] of Object.entries({ x1: '2', x2: '38', y1: '6', y2: '6', class: item.cls })) line.setAttribute(key, value);
  }
  entry.createSpan( { text: item.label });
 }
 legend.createSpan( { text: note });
}
