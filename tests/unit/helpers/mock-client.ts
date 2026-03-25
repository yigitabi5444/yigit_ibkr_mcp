import { vi } from 'vitest';
import { IBClient } from '../../../src/client/ib-client.js';

export function createMockClient() {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    getDefaultAccountId: vi.fn().mockResolvedValue('U1234567'),
  } as unknown as IBClient;

  return { client };
}
