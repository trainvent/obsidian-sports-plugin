import { ItemView, WorkspaceLeaf, Setting } from 'obsidian';
import type SportsPlugin from '../main';
import { eventsOn, weekDates } from '../model/calendar';
export const SPORTS_VIEW = 'sports-dashboard';
export class SportsDashboard extends ItemView {
 private anchor = new Date();
 constructor(leaf: WorkspaceLeaf, private plugin: SportsPlugin) { super(leaf); }
 getViewType(): string { return SPORTS_VIEW; }
 getDisplayText(): string { return 'Sports'; }
 getIcon(): string { return 'activity'; }
 async onOpen(): Promise<void> { this.render(); }
 render(): void {
  const root = this.contentEl; root.empty(); root.addClass('sports-dashboard');
  root.createEl('h1', { text: 'Sports' });
  new Setting(root).setName('Training overview')
   .addButton(button => button.setButtonText(this.plugin.syncing ? 'Syncing…' : 'Sync now').setDisabled(this.plugin.syncing).onClick(() => this.plugin.sync()))
   .addButton(button => button.setButtonText('Add recurring activity').onClick(() => this.plugin.addRecurring()));
  root.createEl('p', { text: this.plugin.data.plan ? `${this.plugin.data.plan.name} · Last imported ${new Date(this.plugin.data.plan.importedAt).toLocaleString()}` : 'Select a two-sheet workbook in Settings → Sports Plugin to get started.' });
  if (this.plugin.data.lastError) root.createEl('p', { text: this.plugin.data.lastError, cls: 'sports-error' });
  root.createEl('p', { text: this.plugin.data.syncMinutes ? `Automatic workbook sync every ${this.plugin.data.syncMinutes} minutes while Obsidian is running.` : 'Automatic sync is off. Use Sync now to import changes.' });
  new Setting(root).setName('Week')
   .addButton(button => button.setButtonText('Previous').onClick(() => { this.anchor.setDate(this.anchor.getDate() - 7); this.render(); }))
   .addButton(button => button.setButtonText('Today').onClick(() => { this.anchor = new Date(); this.render(); }))
   .addButton(button => button.setButtonText('Next').onClick(() => { this.anchor.setDate(this.anchor.getDate() + 7); this.render(); }))
   .addButton(button => button.setButtonText('Open weekly note').onClick(() => this.plugin.openWeekly(this.anchor)));
  const dates = weekDates(this.anchor);
  for (const date of dates) {
   const section = root.createDiv({ cls: 'sports-day' }); section.createEl('h3', { text: date });
   const sessions = this.plugin.data.plan?.sessions.filter(session => session.date === date) ?? [];
   const events = eventsOn(this.plugin.data.events, date);
   if (!sessions.length && !events.length) section.createEl('p', { text: 'No sessions planned.' });
   for (const session of sessions) {
    section.createEl('strong', { text: session.title });
    const part = this.plugin.data.plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
    section.createEl('p', { text: `${session.sport} · ${session.status} · Planned ${session.plannedMinutes ?? '—'} min · Actual ${session.actualMinutes ?? '—'} min` });
    if (part) { const details = section.createEl('details'); details.createEl('summary', { text: `${part.title} · v${part.version}` }); details.createEl('p', { text: part.prescription }); }
    if (session.notes) section.createEl('p', { text: session.notes });
    if (session.result) section.createEl('p', { text: session.result });
   }
   for (const event of events) section.createEl('p', { text: `${event.time} ${event.title} · ${event.sport} · ${event.minutes} min · Recurring` });
  }
  if (this.plugin.data.events.length) {
   root.createEl('h2', { text: 'Recurring activities' });
   for (const event of this.plugin.data.events) new Setting(root).setName(event.title).setDesc(`${event.sport} · ${event.time}`).addButton(button => button.setButtonText('Remove').onClick(async () => { this.plugin.data.events = this.plugin.data.events.filter(item => item.id !== event.id); await this.plugin.save(); this.plugin.refreshViews(); }));
  }
 }
}
