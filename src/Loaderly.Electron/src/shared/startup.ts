export type StartupReason = 'development' | 'temporary' | 'disabled-by-user' | 'policy' | 'approval' | 'unavailable';
export type StartupState = {
  enabled: boolean;
  registered: boolean;
  canChange: boolean;
  settingsAvailable: boolean;
  reason?: StartupReason;
};
export type StartupRequest = { action: 'get' | 'settings' } | { action: 'set'; enabled: boolean };

export function validateStartupRequest(value: unknown): StartupRequest {
  if (!value || typeof value !== 'object') throw Error('INVALID_STARTUP_REQUEST');
  const request = value as Record<string, unknown>;
  if (request.action === 'get' || request.action === 'settings') return { action: request.action };
  if (request.action === 'set' && typeof request.enabled === 'boolean') return { action: 'set', enabled: request.enabled };
  throw Error('INVALID_STARTUP_REQUEST');
}
