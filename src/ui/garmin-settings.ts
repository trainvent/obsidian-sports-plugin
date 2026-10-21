import { Notice, Platform, Setting } from 'obsidian';
import type SportsPlugin from '../main';
import { tokenStore } from '../garmin/client';

export function garminSettings(container: HTMLElement, plugin: SportsPlugin): void {
 new Setting(container).setName('Garmin').setDesc('Connect your account to import recorded activities. Desktop only. Passwords are never saved. Activity refresh runs at most hourly; sync now refreshes immediately.')
  .addButton(button => button.setButtonText(plugin.data.garminEnabled ? 'Reconnect Garmin' : 'Connect Garmin').setDisabled(!Platform.isDesktop || plugin.syncing).onClick(() => plugin.connectGarmin()))
  .addButton(button => button.setButtonText('Disconnect').setDisabled(!plugin.data.garminEnabled || plugin.syncing).onClick(async () => {
   try {
    await tokenStore(plugin.app, plugin.data.garminSecretId).clear();
    plugin.data.garminEnabled = false;
    if (plugin.data.garminCache) plugin.data.garminCache.error = 'Garmin is disconnected.';
    await plugin.save(); plugin.scheduleSync(); await plugin.refreshNotes(false);
    new Notice('Garmin disconnected. Cached activities are retained.');
   } catch { new Notice('Could not disconnect Garmin. Try again.'); }
  }));
 new Setting(container).setName('Garmin history start').setDesc('First activity date to import, in YYYY-MM-DD format. Defaults to 90 days ago when connecting. A successful sync replaces the imported range, reflecting activity edits and deletions.').addText(input => input.setPlaceholder('YYYY-MM-DD').setValue(plugin.data.garminHistoryStart).onChange(async value => {
  plugin.data.garminHistoryStart = value.trim(); await plugin.save();
 }));
 const cache = plugin.data.garminCache;
 if (cache) container.createEl('p', { text: `${cache.lastSuccess ? `Garmin last synced ${new Date(cache.lastSuccess).toLocaleString()}` : 'Garmin has not synced yet.'}${cache.error ? ` · ${cache.error}` : ''}` });
}
