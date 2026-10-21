import { garminSettingRows } from './ui/garmin-settings';
import type { SportsSettingGroup, SportsSettingRow } from './ui/setting-definitions';
import { App, PluginSettingTab, Setting, Platform } from 'obsidian';
import type SportsPlugin from './main';

export class SportsSettingTab extends PluginSettingTab {
 private refreshGarminControls: (() => void) | undefined;
 refreshGarmin(): void { this.refreshGarminControls?.(); }
 hide(): void { this.refreshGarminControls = undefined; }
 constructor(app: App, public plugin: SportsPlugin) { super(app, plugin); }

 /** Obsidian 1.13+ indexes these definitions without constructing DOM or doing I/O. */
 getSettingDefinitions(): SportsSettingGroup[] {
  const plugin = this.plugin;
  const group = (heading: string, items: SportsSettingRow[]): SportsSettingGroup => ({ type: 'group', heading, cls: 'sports-settings-group sports-settings', items });
  const garmin = garminSettingRows(plugin);
  const garminItems = garmin.items.map(row => ({ ...row, render: (setting: Setting) => {
   this.refreshGarminControls = garmin.refresh;
   row.render(setting);
  } }));
  const sheet = (name: string, desc: string, key: 'strategySheet' | 'trackingSheet' | 'scheduleSheet', placeholder: string): SportsSettingRow => ({ name, desc, render: setting => {
   setting.addText(input => input.setPlaceholder(placeholder).setValue(plugin.data[key]).onChange(async value => {
    plugin.data[key] = value.trim(); await plugin.save(); plugin.scheduleSync();
   }));
  } });
  return [
   group('Workbook', [
    { name: 'Cloud workbook link', desc: 'HTTPS download link to your XLSX. Nextcloud file shares are supported.', render: setting => {
     setting.settingEl.addClass('sports-source-setting');
     setting.addText(input => input.setPlaceholder('HTTPS workbook share link').setValue(plugin.data.workbookPath).onChange(async value => {
      plugin.data.workbookPath = value.trim(); await plugin.save();
     }));
     const help = setting.descEl.createEl('details', { cls: 'sports-source-help' });
     help.createEl('summary', { text: 'Cloud link requirements' });
     help.createEl('p', { text: 'Allow downloads without a login or password. The link is saved in settings; anyone with it may access the file. Sync only downloads and never edits the workbook. Desktop only.' });
    } },
    sheet('Strategy sheet', 'Goals and training parts. Blank to disable.', 'strategySheet', 'Strategy'),
    sheet('Tracking sheet', 'Daily plans and results. Blank to disable.', 'trackingSheet', 'Daily'),
    sheet('Weekly schedule sheet', 'Recurring activities. Blank to disable.', 'scheduleSheet', 'Recurring'),
    { name: 'Example workbook', desc: 'Download a template starting next week, then upload it to your cloud storage.', render: setting => {
     setting.addButton(button => button.setButtonText('Download template').onClick(() => plugin.createExample()));
    } },
   ]),
   group('Garmin', garminItems),
   group('Notes', [
    { name: 'Notes folder', desc: 'Destination inside your vault.', render: setting => {
     setting.addText(input => input.setValue(plugin.data.notesFolder).onChange(async value => {
      if (!value.trim() || value.split(/[\\/]/).includes('..') || value.startsWith('/')) return;
      plugin.data.notesFolder = value.trim(); await plugin.save();
     }));
    } },
    { name: 'Show regular activities', desc: 'Include the weekly schedule in the dashboard and weekly notes.', render: setting => {
     setting.addToggle(input => input.setValue(plugin.data.showRegularActivities).onChange(async value => {
      plugin.data.showRegularActivities = value; await plugin.save(); plugin.refreshViews(); await plugin.refreshNotes(false);
     }));
    } },
    { name: 'Dashboard', render: setting => { setting.addButton(button => button.setButtonText('Open dashboard').onClick(() => plugin.openDashboard())); } },
   ]),
   group('Sync', [
    { name: 'Sync interval', desc: 'While Obsidian is open. Garmin refreshes at most hourly.', render: setting => {
     setting.addDropdown(input => input.addOptions({ '0': 'Manual only', '5': 'Every 5 minutes', '10': 'Every 10 minutes', '15': 'Every 15 minutes', '60': 'Every hour' }).setValue(String(plugin.data.syncMinutes)).onChange(async value => {
      plugin.data.syncMinutes = Number(value); await plugin.save(); plugin.scheduleSync();
     }));
    } },
    { name: 'Sync on startup', render: setting => {
     setting.addToggle(input => input.setValue(plugin.data.syncOnStartup).onChange(async value => { plugin.data.syncOnStartup = value; await plugin.save(); }));
    } },
    { name: 'Refresh all sources', render: setting => { setting.addButton(button => button.setButtonText('Sync now').setDisabled(!Platform.isDesktop).onClick(() => plugin.sync(true))); } },
   ]),
   group('Help', [
    { name: 'Help and feedback', render: setting => {
     setting.controlEl.addClass('sports-settings-links');
     setting.controlEl.createEl('a', { text: 'Get help', href: 'https://next.trainvent.com/de/software-support/', cls: 'sports-settings-link', attr: { target: '_blank', rel: 'noopener noreferrer' } });
     setting.controlEl.createEl('a', { text: 'Report an issue', href: 'https://github.com/trainvent/obsidian-sports-plugin/issues', cls: 'sports-settings-link', attr: { target: '_blank', rel: 'noopener noreferrer' } });
    } },
   ]),
   group('Advanced · recovery', [
    { name: 'Recreate missing notes', desc: 'Restore deleted notes. Existing notes and edits are preserved.', render: setting => {
     setting.addButton(button => button.setButtonText('Recreate notes').setDisabled(!plugin.data.plan && !plugin.data.garminCache && !plugin.data.garminCoachCache).onClick(() => plugin.refreshNotes(true, true)));
    } },
    { name: 'Clear cached data', desc: 'Keep settings and files. Generated sections are backed up before rebuilding.', render: setting => {
     setting.addButton(button => button.setButtonText('Clear cache').onClick(async () => {
      await plugin.clearCachedData();
      // update() is present only on the declarative-settings versions.
      const tab = this as SportsSettingTab & { update?: () => void };
      if (typeof tab.update === 'function') tab.update(); else this.display();
     }));
    } },
   ]),
  ];
 }

 /** Obsidian 1.11–1.12: render the same definitions without the newer API. */
 display(): void {
  const root = this.containerEl;
  root.empty(); root.addClass('sports-settings');
  for (const definition of this.getSettingDefinitions()) {
   let container: HTMLElement;
   if (definition.heading === 'Advanced · recovery') {
    container = root.createEl('details', { cls: 'sports-advanced' });
    container.createEl('summary', { text: definition.heading });
   } else {
    new Setting(root).setName(definition.heading).setHeading();
    container = root.createDiv({ cls: definition.cls });
   }
   for (const row of definition.items) row.render(new Setting(container).setName(row.name).setDesc(row.desc ?? ''));
  }
 }
}
