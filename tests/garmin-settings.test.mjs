import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-settings-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const result = await build({ entryPoints: ['src/ui/garmin-settings.ts'], bundle: true, format: 'cjs', platform: 'node', write: false, plugins: [{ name: 'settings-stub', setup(builder) {
 builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
 builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
 export const Platform = { isDesktop: true };
 export class Notice {}
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
  constructor(container) { container.settings.push(this); }
  setName(value) { this.name = value; return this; }
  setDesc() { return this; }
  addButton(callback) { const control = new Button(); this.buttons.push(control); callback(control); return this; }
  addToggle(callback) { this.toggle = new Toggle(); callback(this.toggle); return this; }
  addText(callback) { this.text = new Text(); callback(this.text); return this; }
 }
 ` }));
} }] });
writeFileSync(`${temp}/settings.cjs`, result.outputFiles[0].text);
const { garminSettings } = createRequire(import.meta.url)(`${temp}/settings.cjs`);

test('open Garmin settings update after sign-in and sync without rebuilding controls or replacing focused input', () => {
 const container = { settings: [], createEl() { return this.status = { setText(value) { this.text = value; } }; } };
 const plugin = { data: { garminEnabled: false, garminHistoryStart: '' }, syncing: false, garminConnecting: false, connectGarmin() {}, save: async () => {} };
 const refresh = garminSettings(container, plugin);
 const [connect, disconnect] = container.settings[0].buttons;
 const history = container.settings[1].text;
 assert.equal(connect.label, 'Connect Garmin'); assert.equal(disconnect.disabled, true);
 plugin.data.garminEnabled = true; plugin.data.garminHistoryStart = '2026-07-23';
 plugin.data.garminCache = { activities: Array(69).fill({}), lastSuccess: '2026-10-21T09:15:00Z', error: '' };
 refresh();
 assert.equal(connect.label, 'Reconnect Garmin'); assert.equal(disconnect.disabled, false);
 assert.equal(history.value, '2026-07-23'); assert.ok(container.status.text.includes('69 activities imported'));
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
