import type { Plugin } from 'obsidian';

/** A local, accessible rendering of a readable tab-separated Markdown code block. */
export function registerPerformanceCharts(plugin: Plugin): void {
 plugin.registerMarkdownCodeBlockProcessor('sports-compare', (source, element) => {
  const lines = source.trim().split('\n');
  if (lines.length > 6 || lines.shift() !== 'Exercise\tPlan\tResult') { element.createEl('pre', { text: source }); return; }
  const rows = lines.map(line => line.split('\t'));
  if (rows.some(row => row.length !== 3 || !/^(?:\d+(?:\.\d+)?)$/.test(row[1] ?? '') || !/^(?:\d+(?:\.\d+)?|—)$/.test(row[2] ?? '') || !Number.isFinite(Number(row[1])) || (row[2] !== '—' && !Number.isFinite(Number(row[2]))))) { element.createEl('pre', { text: source }); return; }
  const container = element.createDiv({ cls: 'sports-performance' });
  container.createEl('p', { text: 'Plan and result · each exercise has its own scale', cls: 'sports-performance-legend' });
  for (const [label, planned, actual] of rows) {
   const row = container.createDiv({ cls: 'sports-performance-row' });
   row.createDiv({ text: label, cls: 'sports-performance-label' });
   const max = Math.max(Number(planned), actual === '—' ? 0 : Number(actual), 1);
   const svg = row.createSvg('svg');
   svg.setAttribute('viewBox', '0 0 400 46');
   svg.setAttribute('role', 'img');
   svg.setAttribute('aria-label', `${label}: plan ${planned}, result ${actual === '—' ? 'unrecorded' : actual}`);
   for (const [index, value] of [planned!, actual!].entries()) {
    const y = index * 23;
    if (value !== '—') {
     const bar = document.createElementNS(svg.namespaceURI, 'rect');
     bar.setAttribute('x', '52'); bar.setAttribute('y', String(y + 2));
     bar.setAttribute('width', String(Number(value) / max * 280)); bar.setAttribute('height', '15');
     bar.setAttribute('rx', '3'); bar.setAttribute('class', index ? 'sports-performance-actual' : 'sports-performance-plan');
     svg.appendChild(bar);
    }
    const text = document.createElementNS(svg.namespaceURI, 'text');
    text.setAttribute('x', '0'); text.setAttribute('y', String(y + 14));
    text.textContent = index ? 'Result' : 'Plan'; svg.appendChild(text);
    const amount = document.createElementNS(svg.namespaceURI, 'text');
    amount.setAttribute('x', '342'); amount.setAttribute('y', String(y + 14));
    amount.textContent = value === '—' ? '—' : value; svg.appendChild(amount);
   }

  }
 });
}
