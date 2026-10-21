import { zipSync, strToU8 } from 'fflate';
import { localDate } from '../model/calendar';
export function exampleWorkbook({ badLink = false, duplicate = false }: { badLink?: boolean; duplicate?: boolean } = {}): ArrayBuffer {
 const escape = (value: string) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const sheet = (rows: string[][]) => `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
 const strategy = [['Plan'],['schema_version','plan_id','plan_name','timezone'],['1','demo','Example plan','Europe/Berlin'],[],['Goals'],['goal_id','title','benchmark'],['g1','Muscle-up','1 unassisted repetition'],['g2','Handstand push-up','1 controlled repetition'],['g3','Pistol squat','1 repetition on each side'],[],['Parts'],['part_id','version','title','prescription'],['a','1','Skills A','Muscle-up and pistol practice: record assistance, sets and reps.'],['b','1','Skills B','Handstand push-up and pistol practice: record variations, sets and reps.'],[],['PartGoals'],['part_id','version','goal_id'],['a','1',badLink ? 'missing' : 'g1'],['a','1','g3'],['b','1','g2'],['b','1','g3']];
 const row = ['s1',localDate(new Date()),'strength','Skills A','a','1','40','','','planned'];
 const log = [['Sessions'],['session_id','date','sport','title','part_id','part_version','planned_minutes','actual_minutes','result','status'],row];
 if (duplicate) log.push(row);
 const files = {
  '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Strategy" sheetId="1" r:id="rId1"/><sheet name="Daily" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml': sheet(strategy), 'xl/worksheets/sheet2.xml': sheet(log),
 };
 const zip = zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
 return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
}
