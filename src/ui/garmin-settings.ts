import { Notice, Platform, Setting, type ButtonComponent, type TextComponent } from 'obsidian';
import type SportsPlugin from '../main';
import { tokenStore } from '../garmin/client';

/** Refresh existing controls without rebuilding the panel or interrupting an edit. */
export function garminSettings(container: HTMLElement, plugin: SportsPlugin): () => void {
 let connect: ButtonComponent; let disconnect: ButtonComponent; let history: TextComponent;
 let disconnecting = false;
 new Setting(container).setName('Garmin').setDesc('Connect your account to import recorded activities. Desktop only. Passwords are never saved. Activity refresh runs at most hourly; sync now refreshes immediately.')
  .addButton(button => { connect = button; button.onClick(() => plugin.connectGarmin()); })
  .addButton(button => {
   disconnect = button; button.setButtonText('Disconnect').onClick(async () => {
    disconnecting = true; refresh();
    try {
     await tokenStore(plugin.app, plugin.data.garminSecretId).clear();
     plugin.data.garminEnabled = false;
     if (plugin.data.garminCache) plugin.data.garminCache.error = 'Garmin is disconnected.';
     await plugin.save(); plugin.scheduleSync(); await plugin.refreshNotes(false);
     new Notice('Garmin disconnected. Cached activities are retained.');
    } catch { new Notice('Could not disconnect Garmin. Try again.'); }
    finally { disconnecting = false; refresh(); }
   });
  });
 new Setting(container).setName('Garmin history start').setDesc('First activity date to import, in YYYY-MM-DD format. Defaults to 90 days ago when connecting. A successful sync replaces the imported range, reflecting activity edits and deletions.').addText(input => {
  history = input; input.setPlaceholder('YYYY-MM-DD').setValue(plugin.data.garminHistoryStart).onChange(async value => {
   plugin.data.garminHistoryStart = value.trim(); await plugin.save();
  });
 });
 const status = container.createEl('p');
 function refresh(): void {
  const busy = plugin.syncing || plugin.garminConnecting || disconnecting;
  connect.setButtonText(plugin.data.garminEnabled ? 'Reconnect Garmin' : 'Connect Garmin').setDisabled(!Platform.isDesktop || busy);
  disconnect.setDisabled(!plugin.data.garminEnabled || busy);
  if (history.inputEl.ownerDocument.activeElement !== history.inputEl) history.setValue(plugin.data.garminHistoryStart);
  const cache = plugin.data.garminCache;
  const connection = plugin.data.garminEnabled ? 'Connected to Garmin.' : 'Garmin is disconnected.';
  status.setText(`${connection}${cache ? ` ${cache.activities.length} activities imported. ${cache.lastSuccess ? `Last synced ${new Date(cache.lastSuccess).toLocaleString()}.` : 'No successful sync yet.'}${cache.error ? ` ${cache.error}` : ''}` : ''}${plugin.syncing && plugin.data.garminEnabled ? ' Syncing…' : ''}`);
 }
 refresh();
 return refresh;
}
