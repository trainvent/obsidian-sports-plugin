import { registerTodayWidget } from './ui/today-widget';
import { registerScoreCharts } from './ui/score-chart';
import { analyticsNoteTasks } from './notes/analytics';
import trackingGuide from '../Tracking.md';
import { registerPerformanceCharts } from './ui/performance-chart';
import { TemplateFormatModal } from './ui/template-format';
import { downloadWorkbook, type WorkbookFormat, type WorkbookKind } from './workbook/download';
import { syncCoachOnlyPlans } from './notes/coach-plans';
import { combinedLogMarkdown } from './notes/combined-log';
import { Plugin, Notice, addIcon, Platform } from 'obsidian';
import { DEFAULT_DATA, type SportsData } from './model/types';
import { weekDates } from './model/calendar';
import { SPORTS_ICON_ID, SPORTS_ICON_SVG } from './ui/icon';
import { SportsSettingTab } from './settings';
import { SPORTS_VIEW, SportsDashboard } from './ui/dashboard';
import { ensureSheetGuide, openSheetGuide } from './notes/sheet-guide';
import { templateWorkbook } from './workbook/template-file';
import { syncSources } from './garmin/orchestrate';
import { GarminConnectModal } from './ui/garmin-connect';
import { garminMarkdown } from './garmin/render';
import { clearImportCache, collectRecoveryNotes } from './notes/cache';
import { migrateNoteNames } from './notes/migrate';
import { syncNotes } from './notes/sync';
import { updateNote } from './notes/store';
import { reconcileNoteWarning } from './notes/warnings';
import { weekMarkdown } from './notes/render';

export default class SportsPlugin extends Plugin {
 data!: SportsData;
 syncing = false;
 private timer: number | undefined;
 private refreshWidgets?: () => void;
 private noteBusy = false;
 private settingsTab: SportsSettingTab | undefined;
 get garminConnecting(): boolean { return this.garminDialog !== undefined; }
 private garminDialog: GarminConnectModal | undefined;
 async onload(): Promise<void> {
  this.data = Object.assign({}, DEFAULT_DATA, await this.loadData() as Partial<SportsData>);
  addIcon(SPORTS_ICON_ID, SPORTS_ICON_SVG);
  registerPerformanceCharts(this);
  registerScoreCharts(this);
  this.refreshWidgets = registerTodayWidget(this);
  this.registerView(SPORTS_VIEW, leaf => new SportsDashboard(leaf, this));
  this.addRibbonIcon(SPORTS_ICON_ID, 'Open dashboard', () => { void this.openDashboard(); });
  this.addCommand({ id: 'open-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
  this.addCommand({ id: 'create-example', name: 'Download example workbook', callback: () => this.downloadTrainingWorkbook() });
  this.addCommand({ id: 'download-blank-template', name: 'Download blank template', callback: () => this.downloadTrainingWorkbook(undefined, 'blank') });
  this.addCommand({ id: 'open-workbook-guide', name: 'Open workbook guide', callback: () => openSheetGuide(this) });
  this.addCommand({ id: 'clear-cache', name: 'Clear cached data', callback: () => this.clearCachedData() });
  this.addCommand({ id: 'recreate-notes', name: 'Recreate missing notes', callback: () => this.refreshNotes(true, true) });
  this.addCommand({ id: 'refresh-notes', name: 'Generate notes from imported data', callback: () => this.refreshNotes() });
  this.addCommand({ id: 'connect-garmin', name: 'Connect Garmin', callback: () => this.connectGarmin() });
  this.addCommand({ id: 'sync', name: 'Sync now', callback: () => this.sync(true) });
  this.addCommand({ id: 'open-week', name: 'Create or open weekly note', callback: () => this.openWeekly() });
  this.addCommand({ id: 'open-tracking-guide', name: 'Open flexible tracking guide', callback: () => this.openTrackingGuide() });
  this.addCommand({ id: 'open-analytics', name: 'Open training analytics', callback: () => this.openAnalytics() });
  this.addCommand({ id: 'open-plans', name: 'Open upcoming plans', callback: () => this.openPlans() });
  this.addCommand({ id: 'open-log', name: 'Open training log', callback: () => this.openTrainingLog() });
  this.settingsTab = new SportsSettingTab(this.app, this);
  this.addSettingTab(this.settingsTab);
  this.scheduleSync();
  this.app.workspace.onLayoutReady(() => {
   if (this.data.syncOnStartup) void this.sync();
   else if (this.data.plan) void this.refreshNotes(false);
  });
 }
 onunload(): void { this.garminDialog?.close(); if (this.timer !== undefined) window.clearInterval(this.timer); }
 async downloadTrainingWorkbook(format?: WorkbookFormat, kind: WorkbookKind = 'example'): Promise<void> {
  if (!format) { new TemplateFormatModal(this, kind).open(); return; }
  try {
   await ensureSheetGuide(this);
   const revoke = downloadWorkbook(templateWorkbook(new Date(), format, kind), document, format, kind);
   this.register(revoke);
   const timer = window.setTimeout(revoke, 60_000);
   this.register(() => window.clearTimeout(timer));
   new Notice(`${kind === 'blank' ? 'Blank template' : 'Example workbook'} download started. Use Guide/Workbook.md to adapt it before uploading and syncing.`);
  } catch (error) {
   new Notice(error instanceof Error ? error.message : 'Could not download the workbook.');
  }
 }
 async save(): Promise<void> { await this.saveData(this.data); }
 async refreshNotes(notify = true, recreateMissing = false): Promise<void> {
  if (this.syncing || this.noteBusy) return;
  if (!this.data.plan && !this.data.garminCache && !this.data.garminCoachCache) { if (notify) new Notice('Sync a workbook or Garmin before generating notes.'); return; }
  this.noteBusy = true;
  try {
   const issues = this.data.plan ? await syncNotes(this, this.data.plan, recreateMissing) : [];
   if (!this.data.plan) {
    issues.push(...await migrateNoteNames(this));
    await updateNote(this, 'Analytics/Log.md', 'training-log', combinedLogMarkdown(null, this.data.garminCache, new Date(), this.data.notesFolder), '# Log\n\n## Reflections\n', recreateMissing);
    for (const task of analyticsNoteTasks(null, this.data.notesFolder, this.data.garminCache)) {
     if (!issues.some(issue => issue.startsWith(`${task.path}:`))) await updateNote(this, task.path, task.id, task.body, task.initial, recreateMissing);
    }
   }
   await syncCoachOnlyPlans(this, recreateMissing);
   const warning = reconcileNoteWarning(this.data.lastError, issues);
   if (warning !== this.data.lastError) { this.data.lastError = warning; await this.save(); }
   if (notify || issues.length) new Notice(issues[0] || 'Sports notes generated in the notes folder.');
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not generate notes.'); }
  finally { this.noteBusy = false; this.refreshViews(); }
 }
 async clearCachedData(): Promise<void> {
  if (this.syncing || this.noteBusy) { new Notice('Wait for the current sync to finish before clearing cached data.'); return; }
  this.noteBusy = true;
  try {
   const pending = await collectRecoveryNotes(this);
   clearImportCache(this.data);
   this.data.noteRecoveryPending = [...new Set([...this.data.noteRecoveryPending, ...pending])];
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
  this.refreshWidgets?.();
  this.settingsTab?.refreshGarmin();
  for (const leaf of this.app.workspace.getLeavesOfType(SPORTS_VIEW)) if (leaf.view instanceof SportsDashboard) leaf.view.render();
 }
 async openDashboard(): Promise<void> {
  const existing = this.app.workspace.getLeavesOfType(SPORTS_VIEW)[0];
  const leaf = existing ?? this.app.workspace.getLeaf('tab');
  if (!existing) await leaf.setViewState({ type: SPORTS_VIEW, active: true });
  await this.app.workspace.revealLeaf(leaf);
 }
 async openPlans(): Promise<void> {
  if (this.syncing || this.noteBusy) return;
  await this.refreshNotes(false);
  const file = this.app.vault.getFileByPath(`${this.data.notesFolder}/Structure/Plans.md`);
  if (file) await this.app.workspace.getLeaf(false).openFile(file);
  else new Notice('Sync a workbook before opening plans.');
 }
 async openAnalytics(): Promise<void> {
  if (this.syncing || this.noteBusy) return;
  this.noteBusy = true;
  try {
   const issues = await migrateNoteNames(this);
   if (issues.length) throw new Error(issues[0]);
   for (const task of analyticsNoteTasks(this.data.plan, this.data.notesFolder, this.data.garminCache)) {
    await updateNote(this, task.path, task.id, task.body, task.initial);
   }
   const file = this.app.vault.getFileByPath(`${this.data.notesFolder}/Stats.md`);
   if (file) await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not open analytics.'); }
  finally { this.noteBusy = false; }
 }
 async openTrackingGuide(): Promise<void> {
  if (this.noteBusy || this.syncing) return;
  this.noteBusy = true;
  try {
   const file = await updateNote(this, 'Guide/Tracking.md', 'tracking-guide', trackingGuide, '# Flexible Daily tracking\n\n## My workbook choices\n');
   await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not open the tracking guide.'); }
  finally { this.noteBusy = false; }
 }
 async openTrainingLog(): Promise<void> {
  if (this.noteBusy) return;
  if (this.data.resetNoteBaselines && !this.data.plan) { new Notice('Sync the workbook before opening generated notes.'); return; }
  this.noteBusy = true;
  try {
   const issues = await migrateNoteNames(this);
   if (issues.length) throw new Error(issues[0]);
   const file = await updateNote(this, 'Analytics/Log.md', 'training-log', `${combinedLogMarkdown(this.data.plan, this.data.garminCache, new Date(), this.data.notesFolder)}`, '# Log\n\n## Commentary\n');
   await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not update the training log.'); }
  finally { this.noteBusy = false; }
 }
 async openWeekly(anchor = new Date(), review = false): Promise<void> {
  if (this.noteBusy) return;
  if (this.data.resetNoteBaselines && !this.data.plan) { new Notice('Sync the workbook before opening generated notes.'); return; }
  this.noteBusy = true;
  try {
   const dates = weekDates(anchor);
   const file = await updateNote(this, `Weeks/${dates[0]}.md`, `week:${dates[0]}`, `${weekMarkdown(this.data.plan, dates, this.data.showRegularActivities) + garminMarkdown(this.data.garminCache, dates)}`, `# Week of ${dates[0]}\n\n## Reflections\n\n### What improved\n\n- \n\n### Recovery and comfort\n\n- \n\n### What to adjust\n\n- \n\n### Next week's focus\n\n- \n`);
   if (review) {
    const content = await this.app.vault.read(file);
    const personal = content.slice(content.indexOf(`<!-- sports:end week:${dates[0]} -->`) + `<!-- sports:end week:${dates[0]} -->`.length);
    const heading = /^## (Weekly review|Reflections)\s*$/m.exec(personal)?.[1];
    await this.app.workspace.openLinkText(`${file.path}${heading ? `#${heading}` : ''}`, '', false);
   } else await this.app.workspace.getLeaf(false).openFile(file);
  } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not update the weekly note.'); }
  finally { this.noteBusy = false; }
 }
}
