import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

export type StoreAction = 'check' | 'download' | 'install';
export type StoreResult = 'available' | 'current' | 'completed' | 'canceled';
export interface StoreUpdateBackend {
  run(action: StoreAction, progress?: (percent: number) => void): Promise<StoreResult>;
}
export function storeHelperEvent(line: string): {kind:'progress';progress:number}|{kind:'result';status:StoreResult|'error'} {
  const event = JSON.parse(line);
  if (event?.kind === 'progress' && typeof event.progress === 'number' && Number.isFinite(event.progress) && event.progress >= 0 && event.progress <= 100) return event;
  if (event?.kind === 'result' && ['available','current','completed','canceled','error'].includes(event.status)) return event;
  throw Error('INVALID_STORE_RESPONSE');
}
export function windowsStoreUpdates(resources: string, windowHandle: () => Buffer | undefined): StoreUpdateBackend {
  return { run(action, progress) {
    const handle = windowHandle();
    if (!handle || ![4,8].includes(handle.length)) return Promise.reject(Error('STORE_WINDOW_UNAVAILABLE'));
    const hwnd = handle.length === 8 ? handle.readBigUInt64LE().toString() : handle.readUInt32LE().toString();
    return new Promise((resolve, reject) => {
      const child = spawn(join(resources,'native','LoaderlyStoreUpdates.exe'),[action,hwnd],{windowsHide:true,stdio:['ignore','pipe','ignore']});
      let result: StoreResult | 'error' | undefined, invalid = false, bytes = 0;
      const timer = setTimeout(() => { child.kill(); reject(Error('STORE_TIMEOUT')); }, action === 'check' ? 45_000 : 2 * 60 * 60_000);
      timer.unref();
      child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes > 4 * 1024 * 1024) { invalid = true; child.kill(); } });
      const lines = createInterface({input:child.stdout});
      lines.on('line', line => {
        try { const event = storeHelperEvent(line); if(event.kind === 'progress') progress?.(event.progress); else result = event.status; }
        catch { invalid = true; child.kill(); }
      });
      child.once('error', error => { clearTimeout(timer); lines.close(); reject(error); });
      child.once('close', code => {
        clearTimeout(timer); lines.close();
        if (code !== 0 || invalid || !result || result === 'error') reject(Error('STORE_UNAVAILABLE'));
        else resolve(result);
      });
    });
  }};
}
