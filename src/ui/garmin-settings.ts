import { Notice, Platform, Setting, type ButtonComponent, type TextComponent, type ToggleComponent } from 'obsidian';
import type SportsPlugin from '../main';
import { tokenStore } from '../garmin/client';

/** Refresh existing controls without rebuilding the panel or interrupting an edit. */
export function garminSettings(container: HTMLElement, plugin: SportsPlugin): () => void {
 let connect: ButtonComponent; let disconnect: ButtonComponent; let history: TextComponent;
 let disconnecting = false; let coach: ToggleComponent;
 const connection = new Setting(container).setName('Connection').setDesc('Import activities from your Garmin account. Passwords are never saved.')
  .addButton(button => { connect = button; button.onClick(() => plugin.connectGarmin()); })
  .addButton(button => {
   disconnect = button; button.setButtonText('Disconnect').onClick(async () => {
    disconnecting = true; refresh();
    try {
     await tokenStore(plugin.app, plugin.data.garminSecretId).clear();
     plugin.data.garminEnabled = false;
     if (plugin.data.garminCache) plugin.data.garminCache.error = 'Garmin is disconnected.';
     if (plugin.data.garminCoachCache) plugin.data.garminCoachCache.error = 'Garmin is disconnected. Cached Coach workouts may be outdated.';
     await plugin.save(); plugin.scheduleSync(); await plugin.refreshNotes(false);
     new Notice('Garmin disconnected. Cached activities are retained.');
    } catch { new Notice('Could not disconnect Garmin. Try again.'); }
    finally { disconnecting = false; refresh(); }
   });
  });
 const status = connection.descEl.createDiv({ cls: 'sports-garmin-status', attr: { role: 'status', 'aria-live': 'polite' } });
 new Setting(container).setName('Import from').setDesc('First activity date. Defaults to 90 days ago.').addText(input => {
  history = input; input.setPlaceholder('YYYY-MM-DD').setValue(plugin.data.garminHistoryStart).onChange(async value => {
   plugin.data.garminHistoryStart = value.trim(); await plugin.save();
  });
 });
 new Setting(container).setName('Show Garmin Coach plans').setDesc('Upcoming workouts in the plans and calendar notes.').addToggle(toggle => {
  coach = toggle; toggle.setValue(plugin.data.showGarminCoachPlans ?? false).onChange(async value => {
   plugin.data.showGarminCoachPlans = value;
   await plugin.save(); await plugin.refreshNotes(false);
   if (value && plugin.data.garminEnabled) await plugin.sync(true);
  });
 });
 function refresh(): void {
  const busy = plugin.syncing || plugin.garminConnecting || disconnecting;
  connect.setButtonText(plugin.data.garminEnabled ? 'Reconnect Garmin' : 'Connect Garmin').setDisabled(!Platform.isDesktop || busy);
  disconnect.setDisabled(!plugin.data.garminEnabled || busy);
  if (history.inputEl.ownerDocument.activeElement !== history.inputEl) history.setValue(plugin.data.garminHistoryStart);
  coach.setValue(plugin.data.showGarminCoachPlans ?? false).setDisabled(busy);
  const cache = plugin.data.garminCache;
  const connection = plugin.garminConnecting ? 'Connecting…' : disconnecting ? 'Disconnecting…' : plugin.data.garminEnabled ? 'Connected.' : 'Not connected.';
  status.setText(`${connection}${cache ? ` ${cache.activities.length} activities. ${cache.lastSuccess ? `Updated ${new Date(cache.lastSuccess).toLocaleString()}.` : 'No successful sync yet.'}${cache.error ? ` ${cache.error}` : ''}` : ''}${plugin.syncing && plugin.data.garminEnabled ? ' Syncing…' : ''}${plugin.data.showGarminCoachPlans && plugin.data.garminCoachCache?.error ? ` ${plugin.data.garminCoachCache.error}` : ''}`);
 }
 refresh();
 return refresh;
}
