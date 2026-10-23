/** Shared values from either spreadsheet format, before training-specific parsing. */
export type SheetValue = string | number | boolean | Date | null;
export type SheetData = SheetValue[][];
export interface WorkbookSheet { sheet: string; data: SheetData }
