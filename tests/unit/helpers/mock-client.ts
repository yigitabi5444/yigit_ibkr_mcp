import { vi } from 'vitest';
import { IBClient } from '../../../src/client/ib-client.js';
import { SessionManager } from '../../../src/client/session-manager.js';

export function createMockClient() {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    getDefaultAccountId: vi.fn().mockResolvedValue('U1234567'),
  } as unknown as IBClient;

  const sessionManager = {
    ensureBrokerageSession: vi.fn().mockResolvedValue(undefined),
    checkAuth: vi.fn().mockResolvedValue({ authenticated: true, competing: false, connected: true }),
    isReadOnly: vi.fn().mockReturnValue(false),
    stop: vi.fn(),
  } as unknown as SessionManager;

  return { client, sessionManager };
}
