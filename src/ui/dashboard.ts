import { renderPerformanceChart } from './performance-chart';
import { performanceMarkdown, compactResults } from '../notes/performance';
import { activityDetails } from '../garmin/activities';
import { ItemView, WorkspaceLeaf, Setting } from 'obsidian';
import { SPORTS_ICON_ID } from './icon';
import type SportsPlugin from '../main';
import { weekDates, scheduleOn } from '../model/calendar';
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
  root.createEl('h1', { text: 'Sports' });
  new Setting(root).setName('Training overview')
   .addButton(button => button.setButtonText(this.plugin.syncing ? 'Syncing…' : 'Sync now').setDisabled(this.plugin.syncing).onClick(() => this.plugin.sync(true)))
   .addButton(button => button.setButtonText('Open training log').onClick(() => this.plugin.openTrainingLog()));
  new Setting(root).setName('Sets and plan/result graphs')
   .setDesc('Open plans, review results in analytics, or read the tracking guide.')
   .addButton(button => button.setButtonText('Open plans').onClick(() => this.plugin.openPlans()))
   .addButton(button => button.setButtonText('Open analytics').onClick(() => this.plugin.openAnalytics()))
   .addButton(button => button.setButtonText('Tracking guide').onClick(() => this.plugin.openTrackingGuide()));
  root.createEl('p', { text: this.plugin.data.plan ? `${this.plugin.data.plan.name} · Last imported ${new Date(this.plugin.data.plan.importedAt).toLocaleString()}` : 'Set a workbook source and its sheets in Settings → Sports to get started.' });
  if (this.plugin.data.lastError) root.createEl('p', { text: this.plugin.data.lastError, cls: 'sports-error' });
  root.createEl('p', { text: (this.plugin.data.strategySheet || this.plugin.data.trackingSheet || this.plugin.data.scheduleSheet) && this.plugin.data.syncMinutes ? `Automatic workbook sync every ${this.plugin.data.syncMinutes} minutes while Obsidian is running.` : 'Automatic sync is off. Use Sync now to import changes.' });
  new Setting(root).setName('Week')
   .addButton(button => button.setButtonText('Previous').onClick(() => { this.anchor.setDate(this.anchor.getDate() - 7); this.render(); }))
   .addButton(button => button.setButtonText('Today').onClick(() => { this.anchor = new Date(); this.render(); }))
   .addButton(button => button.setButtonText('Next').onClick(() => { this.anchor.setDate(this.anchor.getDate() + 7); this.render(); }))
   .addButton(button => button.setButtonText('Open weekly note').onClick(() => this.plugin.openWeekly(this.anchor)));
  const cache = this.plugin.data.garminCache;
  if (cache) root.createEl('p', { text: `${cache.lastSuccess ? `Garmin last synced ${new Date(cache.lastSuccess).toLocaleString()}` : 'Garmin has not synced yet.'}${cache.error ? ` · ${cache.error}` : ''}` });
  const dates = weekDates(this.anchor);
  for (const date of dates) {
   const section = root.createDiv({ cls: 'sports-day' }); section.createEl('h3', { text: date });
   const sessions = this.plugin.data.plan?.sessions.filter(session => session.date === date) ?? [];
   const scheduled = this.plugin.data.showRegularActivities ? scheduleOn(this.plugin.data.plan, date) : [];
   const activities = cache?.activities.filter(activity => activity.date === date) ?? [];
   if (!activities.length && !sessions.length && !scheduled.length) section.createEl('p', { text: 'No sessions planned.' });
   for (const activity of activities) {
    section.createEl('a', { text: activity.name, href: `https://connect.garmin.com/modern/activity/${activity.id}` });
    section.createEl('p', { text: `Recorded by Garmin · ${activityDetails(activity)}` });
   }
   for (const session of sessions) {
    section.createEl('strong', { text: session.title });
    const part = this.plugin.data.plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
    section.createEl('p', { text: `${session.sport} · ${session.status} · Planned ${session.plannedMinutes ?? '—'} min · Actual ${session.actualMinutes ?? '—'} min` });
    if (session.prescription) section.createEl('p', { text: session.prescription });
    if (part) { const details = section.createEl('details'); details.createEl('summary', { text: `${part.title} · v${part.version}` }); details.createEl('p', { text: part.prescription }); }
    if (session.notes) section.createEl('p', { text: session.notes });
    if (compactResults(session)) section.createEl('p', { text: compactResults(session) });
    const graph = /```sports-compare\n([\s\S]*?)\n```/.exec(performanceMarkdown(session));
    if (graph) {
     const comparison = section.createEl('details');
     comparison.createEl('summary', { text: 'Sets and plan/result comparison' });
     renderPerformanceChart(graph[1]!, comparison.createDiv());
    }
   }
   for (const item of scheduled) {
    section.createEl('p', { text: `${item.time} ${item.title} · ${item.minutes ?? '—'} min · ${item.recordedBy} · Planned, no manual results` });
    if (item.notes) section.createEl('p', { text: item.notes });
   }
  }
 }
}
