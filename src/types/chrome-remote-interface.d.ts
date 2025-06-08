declare module 'chrome-remote-interface' {
  interface CDPOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    useHostName?: boolean;
    alterPath?: string;
    protocol?: string;
    remote?: boolean;
    tab?: string | number | boolean | ((tabs: any[]) => any);
  }

  interface CDPClient {
    send(method: string, params?: any): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    close(): Promise<void>;
  }

  function CDP(options?: CDPOptions): Promise<CDPClient>;
  namespace CDP {
    function Protocol(options?: CDPOptions): Promise<any>;
    function List(options?: CDPOptions): Promise<any[]>;
    function New(options?: CDPOptions): Promise<any>;
    function Activate(options?: CDPOptions): Promise<any>;
    function Close(options?: CDPOptions): Promise<any>;
    function Version(options?: CDPOptions): Promise<any>;
  }

  export = CDP;
}