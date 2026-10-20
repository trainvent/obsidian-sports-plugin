import { App, PluginSettingTab, Setting, Notice, Platform } from 'obsidian';
import type SportsPlugin from './main';
import { DEFAULT_DATA } from './model/types';
export class SportsSettingTab extends PluginSettingTab {
 constructor(app: App, private plugin: SportsPlugin) { super(app, plugin); }
 display(): void {
  this.containerEl.empty();
  new Setting(this.containerEl).setName('Workbook path').setDesc('Desktop: read a selected local file outside the vault. Supports home-directory paths. Sync never changes the workbook.').addText(input => input.setPlaceholder(DEFAULT_DATA.workbookPath).setValue(this.plugin.data.workbookPath).onChange(async value => { this.plugin.data.workbookPath = value.trim(); await this.plugin.save(); }));
  new Setting(this.containerEl).setName('Strategy sheet').setDesc('Exact tab name for goals and training parts. Leave blank to disable strategy import.').addText(input => input.setPlaceholder('Optional').setValue(this.plugin.data.strategySheet).onChange(async value => { this.plugin.data.strategySheet = value.trim(); await this.plugin.save(); this.plugin.scheduleSync(); }));
  new Setting(this.containerEl).setName('Tracking sheet').setDesc('Exact tab name for session planning and results. Leave blank to disable tracking import.').addText(input => input.setPlaceholder('Optional').setValue(this.plugin.data.trackingSheet).onChange(async value => { this.plugin.data.trackingSheet = value.trim(); await this.plugin.save(); this.plugin.scheduleSync(); }));
  new Setting(this.containerEl).setName('Create template').setDesc('Create a plan starting next week at the configured local path. Existing files are never overwritten.').addButton(button => button.setButtonText('Create workbook').setDisabled(!Platform.isDesktop).onClick(() => this.plugin.createExample()));
  new Setting(this.containerEl).setName('Notes folder').setDesc('Vault folder for the plan, complete log, strategy, and weekly notes. Notes are generated automatically after import.').addText(input => input.setValue(this.plugin.data.notesFolder).onChange(async value => {
   if (!value.trim() || value.split(/[\\/]/).includes('..') || value.startsWith('/')) return;
   this.plugin.data.notesFolder = value.trim(); await this.plugin.save();
  }));
  new Setting(this.containerEl).setName('Clear cached data').setDesc('Clear imported training data and note baselines. Keep settings, recurring activities, and note files. On the next sync, existing generated notes are backed up before rebuilding.').addButton(button => button.setButtonText('Clear cached data').onClick(async () => { await this.plugin.clearCachedData(); this.display(); }));
  new Setting(this.containerEl).setName('Recreate missing notes').setDesc('Restore deleted generated notes from the last imported workbook. Existing notes and their edit protections are preserved.').addButton(button => button.setButtonText('Recreate missing notes').setDisabled(!this.plugin.data.plan).onClick(() => this.plugin.refreshNotes(true, true)));
  new Setting(this.containerEl).setName('Show regular activities').setDesc('Include weekly schedule activities and recurring activities in the dashboard and weekly notes. Off by default; the strategy note always keeps the workbook schedule.').addToggle(input => input.setValue(this.plugin.data.showRegularActivities).onChange(async value => {
   this.plugin.data.showRegularActivities = value; await this.plugin.save(); this.plugin.refreshViews(); await this.plugin.refreshNotes(false);
  }));
  new Setting(this.containerEl).setName('Sync interval').setDesc('Runs while Obsidian is open.').addDropdown(input => input.addOptions({ '0': 'Manual only', '5': 'Every 5 minutes', '10': 'Every 10 minutes', '15': 'Every 15 minutes', '60': 'Every hour' }).setValue(String(this.plugin.data.syncMinutes)).onChange(async value => { this.plugin.data.syncMinutes = Number(value); await this.plugin.save(); this.plugin.scheduleSync(); }));
  new Setting(this.containerEl).setName('Sync on startup').addToggle(input => input.setValue(this.plugin.data.syncOnStartup).onChange(async value => { this.plugin.data.syncOnStartup = value; await this.plugin.save(); }));
  new Setting(this.containerEl).setName('Sync workbook').addButton(button => button.setButtonText('Sync now').setDisabled(!Platform.isDesktop).onClick(() => this.plugin.sync()));
  new Setting(this.containerEl).setName('Prototype scope').setDesc('Optional strategy and tracking sheets, weekly dashboard, weekly recurring activities, and protected Markdown generation. No cloud or tracker connections yet.').addButton(button => button.setButtonText('Open dashboard').onClick(async () => { await this.plugin.openDashboard(); new Notice('Sports dashboard opened.'); }));
 }
}
