import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { StartupBackend } from './startup';
import type { StartupState } from '../shared/startup';

export function startupTaskState(value: string): StartupState {
  const name = value.trim();
  if (!['Enabled', 'Disabled', 'DisabledByUser', 'DisabledByPolicy', 'EnabledByPolicy'].includes(name)) throw Error('INVALID_STARTUP_TASK_STATE');
  const policy = name.endsWith('ByPolicy');
  return {
    enabled: name === 'Enabled' || name === 'EnabledByPolicy', registered: true,
    canChange: !policy && name !== 'DisabledByUser', settingsAvailable: true,
    ...(policy ? { reason: 'policy' as const } : name === 'DisabledByUser' ? { reason: 'disabled-by-user' as const } : {})
  };
}

export function windowsStartupTask(openSettings: () => Promise<void>, resources: string): StartupBackend {
  const run = async (action: 'get' | 'enable' | 'disable') => {
    const executable = join(resources, 'native', 'LoaderlyStartupTask.exe');
    const { stdout } = await promisify(execFile)(executable, [action], { windowsHide: true, timeout: 12_000, maxBuffer: 64 * 1024 });
    return startupTaskState(stdout);
  };
  return { read: () => run('get'), set: async enabled => { await run(enabled ? 'enable' : 'disable'); }, openSettings, systemDefault: true };
}

