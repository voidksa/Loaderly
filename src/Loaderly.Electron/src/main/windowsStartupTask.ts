import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { StartupBackend } from './startup';
import type { StartupState } from '../shared/startup';

export const startupTaskId = 'LoaderlyStartup';

// Windows PowerShell ships with the OS and provides the WinRT projection needed
// by an MSIX full-trust process. The child inherits the package identity. Only
// these fixed operations are accepted; no paths or renderer strings enter code.
export function startupTaskScript(action: 'get' | 'enable' | 'disable'): string {
  const change = action === 'enable'
    ? "$null = Await ($task.RequestEnableAsync()) ([Windows.ApplicationModel.StartupTaskState])"
    : action === 'disable' ? '$task.Disable()' : '';
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.ApplicationModel.StartupTask, Windows.ApplicationModel, ContentType=WindowsRuntime]
$null = [Windows.ApplicationModel.StartupTaskState, Windows.ApplicationModel, ContentType=WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\u00601' } | Select-Object -First 1
function Await($operation, $type) {
  $awaitable = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  if (-not $awaitable.Wait(8000)) { throw 'Startup task timed out' }
  return $awaitable.Result
}
$task = Await ([Windows.ApplicationModel.StartupTask]::GetAsync('${startupTaskId}')) ([Windows.ApplicationModel.StartupTask])
${change}
[Console]::WriteLine($task.State.ToString())
`;
}

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

export function windowsStartupTask(openSettings: () => Promise<void>): StartupBackend {
  const run = async (action: 'get' | 'enable' | 'disable') => {
    const executable = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const { stdout } = await promisify(execFile)(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(startupTaskScript(action), 'utf16le').toString('base64')], { windowsHide: true, timeout: 12_000, maxBuffer: 64 * 1024 });
    return startupTaskState(stdout);
  };
  return { read: () => run('get'), set: async enabled => { await run(enabled ? 'enable' : 'disable'); }, openSettings, systemDefault: true };
}
