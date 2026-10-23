import { startTemplateNextMonday } from './template-dates';
import ods from '../../templates/Training-example.ods';
import { startOdsTemplateNextMonday } from './template-ods';
import type { WorkbookFormat } from './download';
import template from '../../templates/Training-example.xlsx';

/** Return an independent copy; imported workbooks are never modified. */
export function templateWorkbook(now = new Date(), format: WorkbookFormat = 'xlsx'): ArrayBuffer {
 if (format === 'ods') return startOdsTemplateNextMonday(Uint8Array.from(ods), now);
 return startTemplateNextMonday(Uint8Array.from(template), now);
}
