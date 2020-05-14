declare module 'vscode-cache' {
  export class Cache {
    constructor(a: any, b: any)
    has(key: string): boolean;
    get(key: string): any;
    put(key: string, value: any): void;
    forget(key: string): void;
  }

  export = Cache;
}
