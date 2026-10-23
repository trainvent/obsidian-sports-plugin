import type { SheetData } from './sheet-data';
type Value = SheetData[number][number];

/** Read stored values, never evaluate formulas or use localized display numbers. */
export function odsValue(attrs: Record<string, string>, text: string, hasSavedText = false): Value {
 const type = attrs['office:value-type'];
 const formula = attrs['table:formula'];
 const invalid = (): never => { throw new Error('ODS cell has an invalid or missing saved value. Recalculate and save the workbook in your spreadsheet editor, then sync again.'); };
 if (formula && ((!type && !hasSavedText) || /^#(?:REF!|VALUE!|DIV\/0!|NAME\?|N\/A|NUM!|ERROR!)/.test(text))) invalid();
 switch (type) {
  case 'float': case 'percentage': case 'currency': {
   const raw = attrs['office:value'];
   if (!raw?.trim() || !Number.isFinite(Number(raw))) invalid();
   return Number(raw);
  }
  case 'boolean': {
   const raw = attrs['office:boolean-value'];
   if (raw !== 'true' && raw !== 'false') invalid();
   return raw === 'true';
  }
  case 'date': {
   const raw = attrs['office:date-value'] ?? '';
   // Keep the sheet's calendar date and clock independent of the machine timezone.
   const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}(?:\.\d+)?))?(?:Z|[+-]\d{2}:\d{2})?$/.exec(raw);
   if (!match) invalid();
   const value = new Date(`${match![1]}T${match![2] || '00:00:00'}Z`);
   if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== match![1]) invalid();
   return value;
  }
  case 'time': {
   const raw = attrs['office:time-value'] ?? '';
   const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(raw);
   if (!match || !match.slice(1).some(Boolean)) invalid();
   const seconds = Number(match![1] || 0) * 86400 + Number(match![2] || 0) * 3600 + Number(match![3] || 0) * 60 + Number(match![4] || 0);
   if (!Number.isFinite(seconds) || seconds > Number.MAX_SAFE_INTEGER) invalid();
   // Match XLSX's Date representation for clocks/timed sets. Long durations
   // use mm:ss text so the existing tracking parser doesn't wrap at 24 hours.
   if (seconds >= 86400) return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
   return new Date(Date.UTC(1899, 11, 30) + seconds * 1000);
  }
  case 'string': return attrs['office:string-value'] ?? text;
  case undefined: return text || null;
  default: return invalid();
 }
}
