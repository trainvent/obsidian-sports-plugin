import { Plugin, Notice } from 'obsidian';
import { DEFAULT_DATA, type SportsData } from './model/types';
import { weekDates } from './model/calendar';
import { SportsSettingTab } from './settings';
import { SPORTS_VIEW, SportsDashboard } from './ui/dashboard';
import { RecurringModal } from './ui/recurring';
import { exampleWorkbook } from './workbook/template';
import { syncWorkbook } from './workbook/sync';
import { updateNote } from './notes/store';
import { weekMarkdown } from './notes/render';

export default class SportsPlugin extends Plugin {
 data!: SportsData;
 syncing = false;
 private timer: number | undefined;
 private noteBusy = false;
 async onload(): Promise<void> {
  this.data = Object.assign({}, DEFAULT_DATA, await this.loadData() as Partial<SportsData>);
  this.registerView(SPORTS_VIEW, leaf => new SportsDashboard(leaf, this));
  this.addRibbonIcon('activity', 'Open dashboard', () => { void this.openDashboard(); });
  this.addCommand({ id: 'open-sports-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
  this.addCommand({ id: 'create-sports-example', name: 'Create example workbook', callback: () => this.createExample() });
  this.addCommand({ id: 'sync-sports', name: 'Sync now', callback: () => this.sync() });
  this.addCommand({ id: 'open-sports-week', name: 'Create or open weekly note', callback: () => this.openWeekly() });
  this.addCommand({ id: 'add-sports-recurring', name: 'Add recurring activity', callback: () => this.addRecurring() });
  this.addSettingTab(new SportsSettingTab(this.app, this));
  this.scheduleSync();
  if (this.data.syncOnStartup) this.app.workspace.onLayoutReady(() => { void this.sync(); });
 }
 onunload(): void { if (this.timer !== undefined) window.clearInterval(this.timer); }
 async createExample(): Promise<void> {
  try {
   const path = `Sports-example-${Date.now()}.xlsx`;
   await this.app.vault.createBinary(path, exampleWorkbook());
   this.data.workbookPath = path; await this.save();
   new Notice('Example workbook created and selected. Import it with the sync button.');
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not create the example workbook.'); }
 }
 async save(): Promise<void> { await this.saveData(this.data); }
 async sync(): Promise<void> { await syncWorkbook(this); }
 scheduleSync(): void {
  if (this.timer !== undefined) window.clearInterval(this.timer);
  this.timer = undefined;
  if (Number.isFinite(this.data.syncMinutes) && this.data.syncMinutes >= 5) this.timer = this.registerInterval(window.setInterval(() => { void this.sync(); }, this.data.syncMinutes * 60_000));
  this.refreshViews();
 }
 refreshViews(): void {
  for (const leaf of this.app.workspace.getLeavesOfType(SPORTS_VIEW)) if (leaf.view instanceof SportsDashboard) leaf.view.render();
 }
 async openDashboard(): Promise<void> {
  const existing = this.app.workspace.getLeavesOfType(SPORTS_VIEW)[0];
  const leaf = existing ?? this.app.workspace.getLeaf('tab');
  if (!existing) await leaf.setViewState({ type: SPORTS_VIEW, active: true });
  await this.app.workspace.revealLeaf(leaf);
 }
 addRecurring(): void { new RecurringModal(this).open(); }
 async openWeekly(anchor = new Date()): Promise<void> {
  if (this.noteBusy) return;
  this.noteBusy = true;
  try {
   const dates = weekDates(anchor);
   const file = await updateNote(this, `Weeks/${dates[0]}.md`, `week:${dates[0]}`, weekMarkdown(this.data.plan, this.data.events, dates), `# Week of ${dates[0]}\n\n## Reflections\n\n### What improved\n\n### Recovery and comfort\n\n### What to adjust\n\n### Next week's focus\n`);
   await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not update the weekly note.'); }
  finally { this.noteBusy = false; }
 }
}
