/** Inspect the central directory before the XLSX reader decompresses any entries. */
export function checkWorkbookArchive(buffer: ArrayBuffer): void {
 const view = new DataView(buffer);
 let end = -1;
 for (let offset = buffer.byteLength - 22; offset >= Math.max(0, buffer.byteLength - 65_557); offset--) {
  if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === buffer.byteLength) { end = offset; break; }
 }
 if (end < 0) throw new Error('Invalid workbook ZIP archive.');
 const count = view.getUint16(end + 10, true);
 if (count > 500 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Workbook archive is too complex or unsupported.');
 let offset = view.getUint32(end + 16, true); let total = 0;
 for (let entry = 0; entry < count; entry++) {
  if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid workbook directory.');
  const size = view.getUint32(offset + 24, true);
  total += size;
  if (size > 10 * 1024 * 1024 || total > 20 * 1024 * 1024) throw new Error('Workbook expands beyond the prototype safety limit.');
  offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
 }
 if (offset !== end) throw new Error('Unsupported workbook archive layout.');
}
