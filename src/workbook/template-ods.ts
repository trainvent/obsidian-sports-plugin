import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { readOds } from './ods';
import { nextTemplateMonday } from './template-dates';

/** Shift only our bundled ODS template, retaining its formulas and styles. */
export function startOdsTemplateNextMonday(template: Uint8Array, now = new Date()): ArrayBuffer {
 const files = unzipSync(template);
 let content = strFromU8(files['content.xml']!);
 const strategy = readOds(content, new Set(['Strategy']))[0]?.data;
 const previous = strategy?.[2]?.[4];
 if (!(previous instanceof Date)) throw new Error('The ODS template has no valid start date.');
 const start = nextTemplateMonday(now);
 const delta = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 12) - previous.getTime();
 // All date values in this template are the start date or dates derived from it.
 content = content.replace(/office:date-value="([^"]+)"/g, (_match, raw: string) => {
  const value = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? raw : `${raw}Z`);
  return `office:date-value="${new Date(value.getTime() + delta).toISOString()}"`;
 });
 // Keep the human-readable saved date text aligned with its typed value too.
 content = content.replace(/(<table:table-cell\b[^>]*office:date-value="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*>[\s\S]*?<text:p>)\d{4}-\d{2}-\d{2}(<\/text:p>)/g, '$1$2$3');
 const previousTimezone = strategy?.[2]?.[3];
 if (typeof previousTimezone !== 'string') throw new Error('The ODS template has no timezone.');
 const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
 content = content.replaceAll(`>${previousTimezone}<`, `>${timezone}<`);
 files['content.xml'] = strToU8(content);
 return Uint8Array.from(zipSync({ ...files, mimetype: [files.mimetype!, { level: 0 }] })).buffer;
}
