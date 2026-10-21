import { syncCoachOnlyPlans } from './notes/coach-plans';
import { combinedLogMarkdown } from './notes/combined-log';
import { Plugin, Notice, addIcon, Platform } from 'obsidian';
import { DEFAULT_DATA, type SportsData } from './model/types';
import { weekDates } from './model/calendar';
import { SPORTS_ICON_ID, SPORTS_ICON_SVG } from './ui/icon';
import { SportsSettingTab } from './settings';
import { SPORTS_VIEW, SportsDashboard } from './ui/dashboard';
import { createLocalTemplate } from './workbook/local-file';
import { ensureSheetGuide } from './notes/sheet-guide';
import { templateWorkbook } from './workbook/template-file';
import { syncSources } from './garmin/orchestrate';
import { GarminConnectModal } from './ui/garmin-connect';
import { garminMarkdown } from './garmin/render';
import { noteLink } from './notes/plan';
import { clearImportCache } from './notes/cache';
import { migrateNoteNames } from './notes/migrate';
import { syncNotes } from './notes/sync';
import { updateNote } from './notes/store';
import { weekMarkdown } from './notes/render';

export default class SportsPlugin extends Plugin {
 data!: SportsData;
 syncing = false;
 private timer: number | undefined;
 private noteBusy = false;
 private settingsTab: SportsSettingTab | undefined;
 get garminConnecting(): boolean { return this.garminDialog !== undefined; }
 private garminDialog: GarminConnectModal | undefined;
 async onload(): Promise<void> {
  this.data = Object.assign({}, DEFAULT_DATA, await this.loadData() as Partial<SportsData>);
  addIcon(SPORTS_ICON_ID, SPORTS_ICON_SVG);
  this.registerView(SPORTS_VIEW, leaf => new SportsDashboard(leaf, this));
  this.addRibbonIcon(SPORTS_ICON_ID, 'Open dashboard', () => { void this.openDashboard(); });
  this.addCommand({ id: 'open-sports-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
  this.addCommand({ id: 'create-sports-example', name: 'Create example workbook', callback: () => this.createExample() });
  this.addCommand({ id: 'clear-sports-cache', name: 'Clear cached data', callback: () => this.clearCachedData() });
  this.addCommand({ id: 'recreate-sports-notes', name: 'Recreate missing notes', callback: () => this.refreshNotes(true, true) });
  this.addCommand({ id: 'refresh-sports-notes', name: 'Generate notes from imported data', callback: () => this.refreshNotes() });
  this.addCommand({ id: 'connect-sports-garmin', name: 'Connect Garmin', callback: () => this.connectGarmin() });
  this.addCommand({ id: 'sync-sports', name: 'Sync now', callback: () => this.sync(true) });
  this.addCommand({ id: 'open-sports-week', name: 'Create or open weekly note', callback: () => this.openWeekly() });
  this.addCommand({ id: 'open-sports-log', name: 'Open training log', callback: () => this.openTrainingLog() });
  this.settingsTab = new SportsSettingTab(this.app, this);
  this.addSettingTab(this.settingsTab);
  this.scheduleSync();
  this.app.workspace.onLayoutReady(() => {
   if (this.data.syncOnStartup) void this.sync();
   else if (this.data.plan) void this.refreshNotes(false);
  });
 }
 onunload(): void { this.garminDialog?.close(); if (this.timer !== undefined) window.clearInterval(this.timer); }
 async createExample(): Promise<void> {
  try {
   const path = this.data.workbookPath || DEFAULT_DATA.workbookPath;
   await createLocalTemplate(path, templateWorkbook());
   await ensureSheetGuide(this);
   this.data.workbookPath = path; this.data.strategySheet = 'Strategy'; this.data.trackingSheet = 'Daily'; this.data.scheduleSheet = 'Recurring'; await this.save();
   new Notice('Workbook created, starting next week. The sheet guide is in your vault notes folder. Existing guides are preserved.');
  } catch (error) {
   const message = error instanceof Error && 'code' in error && error.code === 'EEXIST' ? 'A workbook already exists there. Choose a new path to create a template; existing workbooks are never overwritten.' : error instanceof Error ? error.message : 'Could not create the example workbook.';
   new Notice(message);
  }
 }
 async save(): Promise<void> { await this.saveData(this.data); }
 async refreshNotes(notify = true, recreateMissing = false): Promise<void> {
  if (this.syncing || this.noteBusy) return;
  if (!this.data.plan && !this.data.garminCache && !this.data.garminCoachCache) { if (notify) new Notice('Sync a workbook or Garmin before generating notes.'); return; }
  this.noteBusy = true;
  try {
   const issues = this.data.plan ? await syncNotes(this, this.data.plan, recreateMissing) : [];
   if (!this.data.plan) await updateNote(this, 'Log.md', 'training-log', combinedLogMarkdown(null, this.data.garminCache), '# Log\n\n## Reflections\n', recreateMissing);
   await syncCoachOnlyPlans(this, recreateMissing);
   if (issues.length || recreateMissing) { this.data.lastError = issues[0] || ''; await this.save(); }
   if (notify || issues.length) new Notice(issues[0] || 'Sports notes generated in the notes folder.');
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not generate notes.'); }
  finally { this.noteBusy = false; this.refreshViews(); }
 }
 async clearCachedData(): Promise<void> {
  if (this.syncing || this.noteBusy) { new Notice('Wait for the current sync to finish before clearing cached data.'); return; }
  this.noteBusy = true;
  try {
   clearImportCache(this.data);
   await this.save(); this.refreshViews();
   new Notice('Cached training data cleared. Sync the workbook to rebuild notes. Existing notes will be backed up before rebuilding.');
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not clear cached data.'); }
  finally { this.noteBusy = false; }
 }
 connectGarmin(): void {
  if (!Platform.isDesktop || this.syncing || this.garminDialog) return;
  this.garminDialog = new GarminConnectModal(this, () => { this.garminDialog = undefined; this.scheduleSync(); });
  this.garminDialog.open();
  this.refreshViews();
 }
 async sync(forceGarmin = false): Promise<void> { if (!this.noteBusy && !this.garminDialog) await syncSources(this, forceGarmin); }
 scheduleSync(): void {
  if (this.timer !== undefined) window.clearInterval(this.timer);
  this.timer = undefined;
  if (Platform.isDesktop && (this.data.strategySheet || this.data.trackingSheet || this.data.scheduleSheet || this.data.garminEnabled) && Number.isFinite(this.data.syncMinutes) && this.data.syncMinutes >= 5) this.timer = this.registerInterval(window.setInterval(() => { void this.sync(); }, this.data.syncMinutes * 60_000));
  this.refreshViews();
 }
 refreshViews(): void {
  this.settingsTab?.refreshGarmin();
  for (const leaf of this.app.workspace.getLeavesOfType(SPORTS_VIEW)) if (leaf.view instanceof SportsDashboard) leaf.view.render();
 }
 async openDashboard(): Promise<void> {
  const existing = this.app.workspace.getLeavesOfType(SPORTS_VIEW)[0];
  const leaf = existing ?? this.app.workspace.getLeaf('tab');
  if (!existing) await leaf.setViewState({ type: SPORTS_VIEW, active: true });
  await this.app.workspace.revealLeaf(leaf);
 }
 async openTrainingLog(): Promise<void> {
  if (this.noteBusy) return;
  if (this.data.resetNoteBaselines && !this.data.plan) { new Notice('Sync the workbook before opening generated notes.'); return; }
  this.noteBusy = true;
  try {
   const issues = await migrateNoteNames(this);
   if (issues.length) throw new Error(issues[0]);
   const file = await updateNote(this, 'Log.md', 'training-log', `${noteLink(this.data.notesFolder, 'Plans', 'Plans')}\n\n${combinedLogMarkdown(this.data.plan, this.data.garminCache)}`, '# Log\n\n## Commentary\n');
   await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not update the training log.'); }
  finally { this.noteBusy = false; }
 }
 async openWeekly(anchor = new Date()): Promise<void> {
  if (this.noteBusy) return;
  if (this.data.resetNoteBaselines && !this.data.plan) { new Notice('Sync the workbook before opening generated notes.'); return; }
  this.noteBusy = true;
  try {
   const dates = weekDates(anchor);
   const file = await updateNote(this, `Weeks/${dates[0]}.md`, `week:${dates[0]}`, `${noteLink(this.data.notesFolder, 'Plans', 'Plans')} · ${noteLink(this.data.notesFolder, 'Log', 'Log')}\n\n${weekMarkdown(this.data.plan, dates, this.data.showRegularActivities) + garminMarkdown(this.data.garminCache, dates)}`, `# Week of ${dates[0]}\n\n## Reflections\n\n### What improved\n\n### Recovery and comfort\n\n### What to adjust\n\n### Next week's focus\n`);
   await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not update the weekly note.'); }
  finally { this.noteBusy = false; }
 }
}
