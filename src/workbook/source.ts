import { readCloudWorkbook } from './cloud';
import { readLocalWorkbook } from './local-file';

export async function readWorkbookSource(input: string): Promise<ArrayBuffer> {
 return /^[a-z][a-z\d+.-]*:\/\//i.test(input.trim()) ? readCloudWorkbook(input) : readLocalWorkbook(input);
}
