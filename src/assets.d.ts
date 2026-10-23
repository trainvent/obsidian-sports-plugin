declare module '*.xlsx' {
 const bytes: Uint8Array;
 export default bytes;
}

declare module '*.svg' {
 const svg: string;
 export default svg;
}

declare module '*.md' {
 const text: string;
 export default text;
}

declare module '*.ods' {
 const bytes: Uint8Array;
 export default bytes;
}
