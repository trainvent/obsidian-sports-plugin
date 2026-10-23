import { zipSync, strToU8 } from 'fflate';
export const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function odsCell(value) {
 if (value?.xml) return value.xml;
 if (value === null || value === undefined) return '<table:table-cell/>';
 if (value instanceof Date) return `<table:table-cell office:value-type="date" office:date-value="${value.toISOString()}"><text:p>${value.toISOString().slice(0, 10)}</text:p></table:table-cell>`;
 if (typeof value === 'boolean') return `<table:table-cell office:value-type="boolean" office:boolean-value="${value}"/>`;
 if (typeof value === 'number') return `<table:table-cell office:value-type="float" office:value="${value}"/>`;
 return `<table:table-cell office:value-type="string"><text:p>${escapeXml(value).replaceAll('\n', '</text:p><text:p>')}</text:p></table:table-cell>`;
}
export const odsRow = row => `<table:table-row>${row.map(odsCell).join('')}</table:table-row>`;
export function odsDocument(sheets) {
 return `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3"><office:body><office:spreadsheet>${sheets.map(({ sheet, data, rows }) => `<table:table table:name="${escapeXml(sheet)}">${rows ?? data.map(odsRow).join('')}</table:table>`).join('')}</office:spreadsheet></office:body></office:document-content>`;
}
export function odsArchive(sheets, extra = {}) {
 const bytes = zipSync({ mimetype: [strToU8('application/vnd.oasis.opendocument.spreadsheet'), { level: 0 }], 'content.xml': strToU8(odsDocument(sheets)), ...extra });
 return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
