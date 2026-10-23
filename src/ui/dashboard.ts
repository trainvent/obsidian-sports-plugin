import { renderDashboardDay, dashboardButton as button } from './dashboard-day';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { SPORTS_ICON_ID } from './icon';
import type SportsPlugin from '../main';
export const SPORTS_VIEW = 'sports-dashboard';
export class SportsDashboard extends ItemView {
 private anchor = new Date();
 constructor(leaf: WorkspaceLeaf, private plugin: SportsPlugin) { super(leaf); }
 getViewType(): string { return SPORTS_VIEW; }
 getDisplayText(): string { return 'Sports'; }
 getIcon(): string { return SPORTS_ICON_ID; }
 async onOpen(): Promise<void> { this.render(); }
 render(): void {
  const root = this.contentEl; root.empty(); root.addClass('sports-dashboard');
  const hero = root.createDiv({ cls: 'sports-dash-hero' });
  hero.createSpan( { text: 'Your training', cls: 'sports-dash-eyebrow' });
  hero.createEl('h1', { text: this.plugin.data.plan?.name || 'Sports' });
  const actions = hero.createDiv({ cls: 'sports-dash-actions' });
  const sync = button(actions, this.plugin.syncing ? 'Syncing…' : 'Sync now', () => this.plugin.sync(true), 'mod-cta');
  sync.disabled = this.plugin.syncing;
  button(actions, 'Stats', () => this.plugin.openAnalytics());
  button(actions, 'Training log', () => this.plugin.openTrainingLog());
  button(actions, 'Structure/Plans', () => this.plugin.openPlans());
  if (!this.plugin.data.plan) hero.createEl('p', { text: 'Add a workbook in the plugin settings to see your plan.', cls: 'sports-dash-muted' });
  if (this.plugin.data.lastError) root.createEl('p', { text: this.plugin.data.lastError, cls: 'sports-error' });
  const navigation = root.createDiv({ cls: 'sports-dash-navigation' });
  button(navigation, '← Previous', () => { this.anchor.setDate(this.anchor.getDate() - 1); this.render(); });
  button(navigation, 'Today', () => { this.anchor = new Date(); this.render(); });
  button(navigation, 'Next →', () => { this.anchor.setDate(this.anchor.getDate() + 1); this.render(); });
  button(navigation, 'Open weekly note', () => this.plugin.openWeekly(this.anchor), 'sports-dash-week');
  const rail = root.createDiv({ cls: 'sports-dash-days' });
  const timeline = root.createDiv({ cls: 'sports-dash-timeline' });
  const cache = this.plugin.data.garminCache;
  if (cache?.error) root.createEl('p', { text: cache.error, cls: 'sports-error' });
  for (let offset = 0; offset <= 5; offset++) {
   const day = new Date(this.anchor.getFullYear(), this.anchor.getMonth(), this.anchor.getDate() + offset, 12);
   const { section, isToday, sessions, scheduled, activities } = renderDashboardDay(timeline, this.plugin, day);
   const dayButton = button(rail, '', () => section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 'sports-dash-day-button');
   if (isToday) dayButton.addClass('sports-dash-day-current');
   dayButton.setAttribute('aria-label', `${day.toLocaleDateString()} · ${sessions.length + scheduled.length} sessions · ${activities.length} Garmin activities`);
   dayButton.createSpan({ text: day.toLocaleDateString(undefined, { weekday: 'short' }), cls: 'sports-dash-muted' });
   dayButton.createEl('strong', { text: String(day.getDate()) });
   dayButton.createSpan({ text: sessions.length + scheduled.length ? `${sessions.length + scheduled.length} sessions` : 'No sessions', cls: 'sports-dash-day-count' });
   if (activities.length) dayButton.createSpan({ text: `${activities.length} Garmin`, cls: 'sports-dash-day-count' });
   if (day.getDay() === 0) dayButton.createSpan({ text: 'Reflect on the week', cls: 'sports-dash-day-count' });

  }
  const footer = root.createDiv({ cls: 'sports-dash-footer' });
  button(footer, 'Tracking guide', () => this.plugin.openTrackingGuide());
 }
}
