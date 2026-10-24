import { SuggestModal } from 'obsidian';
import type SportsPlugin from '../main';
import type { WorkbookFormat, WorkbookKind } from '../workbook/download';

export class TemplateFormatModal extends SuggestModal<WorkbookFormat> {
 constructor(private plugin: SportsPlugin, private kind: WorkbookKind = 'example') { super(plugin.app); this.setPlaceholder(`Choose a format for the ${kind === 'blank' ? 'blank template' : 'example workbook'}`); }
 getSuggestions(query: string): WorkbookFormat[] {
  return (['xlsx', 'ods'] as WorkbookFormat[]).filter(format => format.includes(query.toLowerCase()));
 }
 getSuggestionText(format: WorkbookFormat): string { return format === 'xlsx' ? 'XLSX · Excel' : 'ODS · LibreOffice Calc'; }
 renderSuggestion(format: WorkbookFormat, element: HTMLElement): void { element.setText(this.getSuggestionText(format)); }
 onChooseSuggestion(format: WorkbookFormat): void { void this.plugin.downloadTrainingWorkbook(format, this.kind); }
}
