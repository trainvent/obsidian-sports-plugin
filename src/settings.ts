import { garminSettings } from './ui/garmin-settings';
import { App, PluginSettingTab, Setting, Platform } from 'obsidian';
import type SportsPlugin from './main';
import { DEFAULT_DATA } from './model/types';

export class SportsSettingTab extends PluginSettingTab {
 private refreshGarminControls: (() => void) | undefined;
 refreshGarmin(): void { this.refreshGarminControls?.(); }
 hide(): void { this.refreshGarminControls = undefined; }
 constructor(app: App, private plugin: SportsPlugin) { super(app, plugin); }
 display(): void {
  const root = this.containerEl;
  root.empty(); root.addClass('sports-settings');
  const section = (name: string): HTMLElement => {
   new Setting(root).setName(name).setHeading();
   return root.createDiv({ cls: 'sports-settings-group' });
  };
  const workbook = section('Workbook');
  const source = new Setting(workbook).setName('Source').setDesc('Local workbook path or downloadable HTTPS link. Nextcloud file shares are supported.');
  source.settingEl.addClass('sports-source-setting');
  source.addText(input => input.setPlaceholder(DEFAULT_DATA.workbookPath).setValue(this.plugin.data.workbookPath).onChange(async value => {
   this.plugin.data.workbookPath = value.trim(); await this.plugin.save();
  }));
  const disclosure = workbook.createEl('details', { cls: 'sports-source-help' });
  disclosure.createEl('summary', { text: 'Cloud link requirements' });
  disclosure.createEl('p', { text: 'Allow downloads without a login or password. The link is saved in settings; anyone with it may access the file. Sync only downloads and never edits the workbook. Desktop only.' });
  new Setting(workbook).setName('Strategy sheet').setDesc('Goals and training parts. Blank to disable.').addText(input => input.setPlaceholder('Strategy').setValue(this.plugin.data.strategySheet).onChange(async value => {
   this.plugin.data.strategySheet = value.trim(); await this.plugin.save(); this.plugin.scheduleSync();
  }));
  new Setting(workbook).setName('Tracking sheet').setDesc('Daily plans and results. Blank to disable.').addText(input => input.setPlaceholder('Daily').setValue(this.plugin.data.trackingSheet).onChange(async value => {
   this.plugin.data.trackingSheet = value.trim(); await this.plugin.save(); this.plugin.scheduleSync();
  }));
  new Setting(workbook).setName('Weekly schedule sheet').setDesc('Recurring activities. Blank to disable.').addText(input => input.setPlaceholder('Recurring').setValue(this.plugin.data.scheduleSheet).onChange(async value => {
   this.plugin.data.scheduleSheet = value.trim(); await this.plugin.save(); this.plugin.scheduleSync();
  }));
  new Setting(workbook).setName('Example workbook').setDesc('Starts next week. Requires a local path; existing files stay safe.').addButton(button => button.setButtonText('Create workbook').setDisabled(!Platform.isDesktop || /^https?:\/\//i.test(this.plugin.data.workbookPath)).onClick(() => this.plugin.createExample()));

  this.refreshGarminControls = garminSettings(section('Garmin'), this.plugin);

  const notes = section('Notes');
  new Setting(notes).setName('Notes folder').setDesc('Destination inside your vault.').addText(input => input.setValue(this.plugin.data.notesFolder).onChange(async value => {
   if (!value.trim() || value.split(/[\\/]/).includes('..') || value.startsWith('/')) return;
   this.plugin.data.notesFolder = value.trim(); await this.plugin.save();
  }));
  new Setting(notes).setName('Show regular activities').setDesc('Include the weekly schedule in the dashboard and weekly notes.').addToggle(input => input.setValue(this.plugin.data.showRegularActivities).onChange(async value => {
   this.plugin.data.showRegularActivities = value; await this.plugin.save(); this.plugin.refreshViews(); await this.plugin.refreshNotes(false);
  }));
  new Setting(notes).setName('Dashboard').addButton(button => button.setButtonText('Open dashboard').onClick(() => this.plugin.openDashboard()));

  const sync = section('Sync');
  new Setting(sync).setName('Sync interval').setDesc('While Obsidian is open. Garmin refreshes at most hourly.').addDropdown(input => input.addOptions({ '0': 'Manual only', '5': 'Every 5 minutes', '10': 'Every 10 minutes', '15': 'Every 15 minutes', '60': 'Every hour' }).setValue(String(this.plugin.data.syncMinutes)).onChange(async value => {
   this.plugin.data.syncMinutes = Number(value); await this.plugin.save(); this.plugin.scheduleSync();
  }));
  new Setting(sync).setName('Sync on startup').addToggle(input => input.setValue(this.plugin.data.syncOnStartup).onChange(async value => {
   this.plugin.data.syncOnStartup = value; await this.plugin.save();
  }));
  new Setting(sync).setName('Refresh all sources').addButton(button => button.setButtonText('Sync now').setDisabled(!Platform.isDesktop).onClick(() => this.plugin.sync(true)));

  const links = root.createDiv({ cls: 'sports-settings-links' });
  links.createEl('a', { text: '❤️ Sponsor', href: 'https://github.com/sponsors/trainvent', cls: 'sports-settings-link', attr: { target: '_blank', rel: 'noopener noreferrer' } });
  links.createEl('a', { text: 'Get help', href: 'https://next.trainvent.com/de/software-support/', cls: 'sports-settings-link', attr: { target: '_blank', rel: 'noopener noreferrer' } });
  links.createEl('a', { text: 'Report an issue', href: 'https://github.com/trainvent/obsidian-sports-plugin/issues', cls: 'sports-settings-link', attr: { target: '_blank', rel: 'noopener noreferrer' } });

  const advanced = root.createEl('details', { cls: 'sports-advanced' });
  advanced.createEl('summary', { text: 'Advanced · recovery' });
  new Setting(advanced).setName('Recreate missing notes').setDesc('Restore deleted notes. Existing notes and edits are preserved.').addButton(button => button.setButtonText('Recreate notes').setDisabled(!this.plugin.data.plan && !this.plugin.data.garminCache && !this.plugin.data.garminCoachCache).onClick(() => this.plugin.refreshNotes(true, true)));
  new Setting(advanced).setName('Clear cached data').setDesc('Keep settings and files. Generated sections are backed up before rebuilding.').addButton(button => button.setButtonText('Clear cache').onClick(async () => { await this.plugin.clearCachedData(); this.display(); }));
 }
}
