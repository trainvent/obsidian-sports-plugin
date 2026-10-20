import { startTemplateNextMonday } from './template-dates';
import template from '../../templates/Sports-12-week.xlsx';

/** Return an independent copy; imported workbooks are never modified. */
export function templateWorkbook(now = new Date()): ArrayBuffer {
 return startTemplateNextMonday(Uint8Array.from(template), now);
}
