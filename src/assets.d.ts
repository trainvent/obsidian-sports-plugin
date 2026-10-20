declare module '*.xlsx' {
 const bytes: Uint8Array;
 export default bytes;
}

declare module '*.svg' {
 const svg: string;
 export default svg;
}
