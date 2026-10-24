import blankXlsx from '../../templates/Training-Template.xlsx';
import blankOds from '../../templates/Training-Template.ods';
import { startTemplateNextMonday } from './template-dates';
import ods from '../../templates/Training-Example.ods';
import { startOdsTemplateNextMonday } from './template-ods';
import type { WorkbookFormat, WorkbookKind } from './download';
import template from '../../templates/Training-Example.xlsx';

/** Return an independent copy; imported workbooks are never modified. */
export function templateWorkbook(now = new Date(), format: WorkbookFormat = 'xlsx', kind: WorkbookKind = 'example'): ArrayBuffer {
 if (format === 'ods') return startOdsTemplateNextMonday(Uint8Array.from(kind === 'blank' ? blankOds : ods), now);
 return startTemplateNextMonday(Uint8Array.from(kind === 'blank' ? blankXlsx : template), now);
}
