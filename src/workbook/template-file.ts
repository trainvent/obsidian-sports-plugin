import template from '../../templates/Sports-12-week.xlsx';

/** Return an independent copy; imported workbooks are never modified. */
export function templateWorkbook(): ArrayBuffer {
 return Uint8Array.from(template).buffer;
}
