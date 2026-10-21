import { Platform } from 'obsidian';
const MAX_BYTES = 5 * 1024 * 1024;

export function cloudWorkbookUrl(input: string): URL {
 let url: URL;
 try { url = new URL(input.trim()); } catch { throw new Error('Enter a valid HTTPS workbook link.'); }
 if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS workbook link without embedded login details.');
 url.hash = '';
 // Nextcloud file shares, including installations in a subdirectory or index.php.
 if (/\/s\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) url.pathname = url.pathname.replace(/\/$/, '') + '/download';
 return url;
}

interface Download { status: number; location?: string; contentType: string; bytes: ArrayBuffer }
export type WorkbookDownload = (url: URL) => Promise<Download>;

/** Separate unauthenticated transport: no browser cookies or Garmin credentials. */
const download: WorkbookDownload = async url => {
 if (!Platform.isDesktop) throw new Error('Cloud workbook sync currently requires Obsidian desktop.');
 const https = require('https') as typeof import('node:https');
 const { Buffer } = require('buffer') as typeof import('node:buffer');
 return new Promise((resolve, reject) => {
  const req = https.get(url, { headers: { accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'accept-encoding': 'identity' } }, res => {
   if (Number(res.headers['content-length']) > MAX_BYTES) { res.destroy(); reject(new Error('Cloud workbook exceeds the limit of 5 MB.')); return; }
   const chunks: Uint8Array[] = []; let size = 0;
   res.on('data', (chunk: Uint8Array) => {
    size += chunk.length;
    if (size > MAX_BYTES) { res.destroy(new Error('Cloud workbook exceeds the limit of 5 MB.')); return; }
    chunks.push(chunk);
   });
   res.on('error', reject);
   res.on('end', () => {
    const bytes = Buffer.concat(chunks);
    resolve({ status: res.statusCode ?? 500, location: res.headers.location, contentType: res.headers['content-type'] ?? '', bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
   });
  });
  // Bound the entire request, including servers that trickle data indefinitely.
  const timer = window.setTimeout(() => req.destroy(new Error('Cloud workbook download timed out.')), 30_000);
  req.on('close', () => window.clearTimeout(timer));
  req.on('error', () => reject(new Error('Could not download the cloud workbook. Check the link and connection.')));
 });
};

export async function readCloudWorkbook(input: string, fetchFile: WorkbookDownload = download): Promise<ArrayBuffer> {
 if (!Platform.isDesktop) throw new Error('Cloud workbook sync currently requires Obsidian desktop.');
 let url = cloudWorkbookUrl(input);
 const origin = url.origin;
 for (let redirects = 0; redirects <= 5; redirects++) {
  const result = await fetchFile(url);
  if ([301, 302, 303, 307, 308].includes(result.status)) {
   if (!result.location || redirects === 5) throw new Error('Cloud workbook link redirects too many times or has no download destination.');
   const next = cloudWorkbookUrl(new URL(result.location, url).href);
   if (next.origin !== origin) throw new Error('Cloud workbook redirected to another server. Paste the final HTTPS file download link instead.');
   url = next; continue;
  }
  if (result.status !== 200) throw new Error('Cloud workbook is unavailable. Check that the share has not expired and allows downloading without a login or password.');
  if (result.bytes.byteLength > MAX_BYTES) throw new Error('Cloud workbook exceeds the limit of 5 MB.');
  const bytes = new Uint8Array(result.bytes);
  if (/text\/html/i.test(result.contentType) || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new Error('The link did not return an XLSX file. Share the workbook file itself, allow downloads, and use a link without login or password protection.');
  return result.bytes;
 }
 throw new Error('Cloud workbook download failed.');
}
