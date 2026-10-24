import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-settings-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const result = await build({ stdin: { contents: "export { garminSettings } from './src/ui/garmin-settings'; export { SportsSettingTab } from './src/settings';", resolveDir: process.cwd() }, bundle: true, format: 'cjs', platform: 'node', write: false, loader: {'.md':'text'}, plugins: [{ name: 'settings-stub', setup(builder) {
 builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
 builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
 export const Platform = { isDesktop: true };
 export class Notice {}
 export class TFile {}
 export const normalizePath = path => path;
 export class PluginSettingTab { constructor() { this.containerEl = {}; } }
 class Button {
  setButtonText(value) { this.label = value; return this; }
  setDisabled(value) { this.disabled = value; return this; }
  onClick(callback) { this.click = callback; return this; }
 }
 class Toggle {
 setValue(value) { this.value = value; return this; }
 setDisabled(value) { this.disabled = value; return this; }
 onChange(callback) { this.change = callback; return this; }
 }
 class Text {
  inputEl = { ownerDocument: { activeElement: null } };
  setPlaceholder() { return this; }
  setValue(value) { this.value = value; return this; }
  onChange(callback) { this.change = callback; return this; }
 }
 export class Setting {
  buttons = [];
  constructor(container) { container.settings.push(this); this.descEl = { createDiv(options) { const el = { options, setText(value) { this.text = value; } }; container.status = el; return el; } }; }
  setName(value) { this.name = value; return this; }
  setDesc() { return this; }
  addButton(callback) { const control = new Button(); this.buttons.push(control); callback(control); return this; }
  addToggle(callback) { this.toggle = new Toggle(); callback(this.toggle); return this; }
  addText(callback) { this.text = new Text(); callback(this.text); return this; }
 }
 ` }));
} }] });
writeFileSync(`${temp}/settings.cjs`, result.outputFiles[0].text);
const { garminSettings, SportsSettingTab } = createRequire(import.meta.url)(`${temp}/settings.cjs`);

test('open Garmin settings update after sign-in and sync without rebuilding controls or replacing focused input', () => {
 const container = { settings: [], createEl() { throw new Error('Status must stay inside the connection setting'); } };
 const plugin = { data: { garminEnabled: false, garminHistoryStart: '' }, syncing: false, garminConnecting: false, connectGarmin() {}, save: async () => {} };
 const refresh = garminSettings(container, plugin);
 const [connect, disconnect] = container.settings[0].buttons;
 const history = container.settings[1].text;
 assert.equal(connect.label, 'Connect Garmin'); assert.equal(disconnect.disabled, true);
 assert.equal(container.status.options.attr['aria-live'], 'polite');
 plugin.data.garminEnabled = true; plugin.data.garminHistoryStart = '2026-07-23';
 plugin.data.garminCache = { activities: Array(69).fill({}), lastSuccess: '2026-10-21T09:15:00Z', error: '' };
 refresh();
 assert.equal(connect.label, 'Reconnect Garmin'); assert.equal(disconnect.disabled, false);
 assert.equal(history.value, '2026-07-23'); assert.ok(container.status.text.includes('69 activities'));
 plugin.syncing = true; refresh(); assert.equal(connect.disabled, true); assert.equal(disconnect.disabled, true);
 history.inputEl.ownerDocument.activeElement = history.inputEl; history.value = 'unfinished edit';
 plugin.syncing = false; refresh(); assert.equal(connect.disabled, false); assert.equal(history.value, 'unfinished edit');
 plugin.data.garminEnabled = false; refresh(); assert.equal(connect.label, 'Connect Garmin'); assert.equal(disconnect.disabled, true);
 assert.equal(container.settings.length, 3);
});

test('Coach toggle saves and refreshes notes, fetching only when enabled and connected', async () => {
 const container = { settings: [], createEl() { return { setText() {} }; } };
 const calls = [];
 const plugin = { data: { garminEnabled: true, garminHistoryStart: '' }, save: async () => calls.push('save'), refreshNotes: async () => calls.push('notes'), sync: async force => calls.push(force) };
 garminSettings(container, plugin);
 const toggle = container.settings[2].toggle;
 assert.equal(toggle.value, false);
 await toggle.change(true);
 assert.equal(plugin.data.showGarminCoachPlans, true);
 assert.deepEqual(calls, ['save', 'notes', true]);
 calls.length = 0;
 await toggle.change(false);
 assert.deepEqual(calls, ['save', 'notes']);
});


test('searchable settings enumerate every row without rendering or accessing storage', async () => {
 const calls = [];
 const plugin = { data: { strategySheet: 'Strategy', showRegularActivities: false }, save: async () => calls.push('save'), scheduleSync: () => calls.push('schedule'), refreshViews: () => calls.push('views'), refreshNotes: async () => calls.push('notes') };
 const tab = new SportsSettingTab({}, plugin);
 const definitions = tab.getSettingDefinitions();
 assert.deepEqual(calls, []);
 assert.deepEqual(definitions.map(group => group.heading), ['Warnings','Workbook','Garmin','Notes','Sync','Help','Advanced · recovery']);
 assert.deepEqual(definitions.find(group => group.heading === 'Garmin').items.map(row => row.name), ['Connection','Import from','Show Garmin Coach plans']);
 const rows = definitions.flatMap(group => group.items);
 for (const name of ['Cloud workbook link','Tracking sheet','Sync interval','Recreate missing notes','Notes folder']) assert.ok(rows.some(row => row.name === name));
 let change;
 rows.find(row => row.name === 'Strategy sheet').render({ addText(callback) { const input = { setPlaceholder() { return this; }, setValue(value) { assert.equal(value, 'Strategy'); return this; }, onChange(callback) { change = callback; return this; } }; callback(input); return this; } });
 await change(' My strategy ');
 assert.equal(plugin.data.strategySheet, 'My strategy');
 assert.deepEqual(calls, ['save','schedule']);
});


test('settings show persistent sync errors at the top and refresh in place after retry', async () => {
 const calls = [];
 const plugin = { data: { lastError: 'Tracking sheet "Log" was not found. Available sheets: "Daily".' }, syncing: false, sync: async force => calls.push(force) };
 const tab = new SportsSettingTab({}, plugin);
 const first = tab.getSettingDefinitions()[0];
 assert.equal(first.heading, 'Warnings');
 const attributes = {};
 const classes = new Set();
 let button;
 const setting = {
  settingEl: { setAttribute(key, value) { attributes[key] = value; }, toggleClass(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } },
  setName(name) { this.name = name; return this; },
  setDesc(desc) { this.desc = desc; return this; },
  addButton(callback) {
   button = { setButtonText(value) { this.text = value; return this; }, setDisabled(value) { this.disabled = value; return this; }, onClick(callback) { this.click = callback; return this; } };
   callback(button); return this;
  },
 };
 first.items[0].render(setting);
 assert.equal(setting.name, 'Workbook sync needs attention');
 assert.ok(setting.desc.includes('"Log" was not found'));
 assert.ok(setting.desc.includes('"Daily"'));
 assert.equal(attributes.role, 'alert');
 assert.equal(attributes['aria-live'], 'polite');
 assert.ok(classes.has('sports-sync-error'));
 assert.ok(!classes.has('sports-warning-empty'));
 await button.click();
 assert.deepEqual(calls, [true]);
 plugin.syncing = true;
 tab.refreshGarmin();
 assert.equal(button.disabled, true);
 assert.ok(setting.desc.includes('was not found')); // Keep the failure until a successful retry.
 plugin.syncing = false; plugin.data.lastError = '';
 tab.refreshGarmin();
 assert.equal(button.disabled, false);
 assert.equal(setting.name, '');
 assert.equal(setting.desc, '');
 assert.equal(attributes.role, 'status');
 assert.ok(!classes.has('sports-sync-error'));
 assert.ok(classes.has('sports-warning-empty'));
 plugin.syncing = true;
 tab.refreshGarmin();
 assert.equal(setting.desc, '');
 assert.ok(classes.has('sports-warning-empty'));
 plugin.data.lastError = 'Another failure';
 tab.refreshGarmin();
 assert.equal(setting.desc, 'Another failure');
 assert.ok(!classes.has('sports-warning-empty'));
 tab.hide();
 plugin.data.lastError = 'New error';
 tab.refreshGarmin();
 assert.equal(setting.desc, 'Another failure');
});
