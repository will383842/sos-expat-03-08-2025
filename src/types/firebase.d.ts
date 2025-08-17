declare module 'firebase/functions' {
  export function getFunctions(app?: any, region?: string): any;
  export function connectFunctionsEmulator(functions: any, host: string, port: number): void;
  export function httpsCallable<T = any, R = any>(functions: any, name: string): (data?: T) => Promise<{ data: R }>;
  export interface HttpsCallable<T = any, R = any> {
    (data?: T): Promise<{ data: R }>;
  }
}
