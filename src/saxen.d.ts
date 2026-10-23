declare module 'saxen' {
 export class Parser {
  ns(namespaces: Record<string, string>): void;
  on(event: 'openTag', callback: (name: string, attributes: () => Record<string, string>, decode: (value: string) => string) => void): void;
  on(event: 'closeTag', callback: (name: string) => void): void;
  on(event: 'text', callback: (value: string, decode: (value: string) => string) => void): void;
  on(event: 'cdata', callback: (value: string) => void): void;
  on(event: 'error' | 'warn', callback: (error: Error) => void): void;
  parse(xml: string): Error | undefined;
 }
}
