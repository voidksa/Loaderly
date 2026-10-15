import { spawn, type ChildProcess } from 'node:child_process';

// Some bundled tools start a worker process. Cancel the owned process group,
// and let callers wait for close before touching its partial files.
export function bindToolCancellation(child: ChildProcess, signal?: AbortSignal) {
  let stopping = false;
  let escalation: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopping || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
    stopping = true;
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false });
      killer.on('error', () => child.kill());
      killer.on('close', code => { if (code) child.kill(); });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); }
      escalation = setTimeout(() => { try { process.kill(-child.pid!, 'SIGKILL'); } catch { /* Already stopped. */ } }, 1000);
      escalation.unref();
    }
  };
  signal?.addEventListener('abort', stop, { once: true });
  child.once('spawn', () => { if (signal?.aborted) stop(); });
  child.once('close', () => { clearTimeout(escalation); signal?.removeEventListener('abort', stop); });
  if (signal?.aborted) stop();
  return stop;
}
