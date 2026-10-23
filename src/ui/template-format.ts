import { SuggestModal } from 'obsidian';
import type SportsPlugin from '../main';
import type { WorkbookFormat } from '../workbook/download';

export class TemplateFormatModal extends SuggestModal<WorkbookFormat> {
 constructor(private plugin: SportsPlugin) { super(plugin.app); this.setPlaceholder('Choose a workbook format'); }
 getSuggestions(query: string): WorkbookFormat[] {
  return (['xlsx', 'ods'] as WorkbookFormat[]).filter(format => format.includes(query.toLowerCase()));
 }
 getSuggestionText(format: WorkbookFormat): string { return format === 'xlsx' ? 'XLSX · Excel' : 'ODS · LibreOffice Calc'; }
 renderSuggestion(format: WorkbookFormat, element: HTMLElement): void { element.setText(this.getSuggestionText(format)); }
 onChooseSuggestion(format: WorkbookFormat): void { void this.plugin.createExample(format); }
}
