import { MarkdownRenderChild } from 'obsidian';
import type SportsPlugin from '../main';
import { localDate } from '../model/calendar';
import { dashboardButton, renderDashboardDay } from './dashboard-day';

/** Each visible embed owns its timer; closing the note releases it. */
class TodayWidget extends MarkdownRenderChild {
 private day = '';
 constructor(element: HTMLElement, private plugin: SportsPlugin, private widgets: Set<TodayWidget>) { super(element); }
 onload(): void {
  this.widgets.add(this);
  this.render();
  this.registerInterval(window.setInterval(() => {
   if (this.day !== localDate(new Date())) this.render();
  }, 60_000));
 }
 onunload(): void { this.widgets.delete(this); this.containerEl.empty(); }
 render(): void {
  const today = new Date();
  this.day = localDate(today);
  const root = this.containerEl;
  root.empty(); root.addClass('sports-dashboard', 'sports-today-widget');
  const header = root.createDiv({ cls: 'sports-dash-widget-header' });
  header.createSpan({ text: 'Today’s training', cls: 'sports-dash-eyebrow' });
  dashboardButton(header, 'Open weekly note', () => this.plugin.openWeekly(new Date()));
  renderDashboardDay(root, this.plugin, today);
 }
}

export function registerTodayWidget(plugin: SportsPlugin): () => void {
 const widgets = new Set<TodayWidget>();
 plugin.registerMarkdownCodeBlockProcessor('sports-today', (_source, element, context) => {
  context.addChild(new TodayWidget(element, plugin, widgets));
 });
 plugin.register(() => { for (const widget of widgets) widget.unload(); widgets.clear(); });
 return () => { for (const widget of widgets) widget.render(); };
}
