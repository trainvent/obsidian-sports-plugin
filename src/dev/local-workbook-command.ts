import { Modal, Notice, Setting } from 'obsidian';
import type SportsPlugin from '../main';
import { setLocalWorkbook, hasLocalWorkbook, localWorkbookPath } from './local-workbook';

export function registerLocalWorkbookOverride(plugin: SportsPlugin): void {
 plugin.addCommand({ id: 'dev-local-workbook', name: 'Development: override workbook with a vault file', callback: () => {
  const modal = new Modal(plugin.app);
  modal.setTitle('Development workbook override');
  const adapter = plugin.app.vault.adapter;
  let value = localWorkbookPath(adapter);
  new Setting(modal.contentEl).setName('Workbook in this vault').setDesc('Overrides the cloud link until reload. Leave blank to restore cloud sync.').addText(input => input.setPlaceholder('Agent-Plan-Test/Resistance-Band-Plan.xlsx').setValue(value).onChange(text => { value = text; }));
  new Setting(modal.contentEl).addButton(button => button.setButtonText('Apply').setCta().onClick(() => {
   try {
    setLocalWorkbook(adapter, value);
    new Notice(hasLocalWorkbook(adapter) ? 'Development local workbook override enabled.' : 'Cloud workbook sync restored.');
    modal.close();
   } catch (error) { new Notice(error instanceof Error ? error.message : 'Invalid local workbook.'); }
  }));
  modal.open();
 } });
 plugin.register(() => setLocalWorkbook(plugin.app.vault.adapter, ''));
}
