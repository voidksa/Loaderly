import { spawn } from 'node:child_process';
import { bindToolCancellation } from './toolProcess';

export function studioProcess(file: string, args: readonly string[], options: { signal?: AbortSignal; onErrorLine?: (line: string) => void; onData?: (chunk: Buffer) => void; maxOutput?: number; env?: NodeJS.ProcessEnv } = {}): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(new Error('TASK_CANCELED')); return; }
    const child = spawn(file, [...args], { windowsHide: true, shell: false, detached: process.platform !== 'win32', env: options.env });
    const stop = bindToolCancellation(child, options.signal);
    const chunks: Buffer[] = []; let bytes = 0, stderr = '', pending = '', exceeded = false, processError: Error | undefined;
    child.stdout.on('data', (chunk: Buffer) => {
      if (options.onData) { options.onData(chunk); return; }
      bytes += chunk.length;
      if (bytes > (options.maxOutput ?? 32 * 1024 * 1024)) { exceeded = true; stop(); return; }
      chunks.push(chunk);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (text: string) => {
      stderr = (stderr + text).slice(-2 * 1024 * 1024); pending += text;
      const lines = pending.split(/[\r\n]/); pending = (lines.pop() ?? '').slice(-65536);
      for (const line of lines) if (line) options.onErrorLine?.(line);
    });
    // Wait for closed streams before callers remove partial output files.
    child.on('error', error => { processError = error; });
    child.on('close', code => {
      if (pending) options.onErrorLine?.(pending);
      if (options.signal?.aborted) reject(new Error('TASK_CANCELED'));
      else if (processError) reject(processError);
      else if (exceeded) reject(new Error('OUTPUT_TOO_LARGE'));
      else if (code !== 0) reject(Object.assign(new Error(stderr.slice(-4000) || `Process exited ${code}`), { stdout: Buffer.concat(chunks).toString('utf8') }));
      else resolve({ stdout: Buffer.concat(chunks), stderr });
    });
  });
}
