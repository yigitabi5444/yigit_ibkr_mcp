import { describe, it, expect, vi, afterEach } from 'vitest';
import { SessionManager } from '../../../src/client/session-manager.js';
import { IBClient } from '../../../src/client/ib-client.js';

function createMockIBClient() {
  return {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    getDefaultAccountId: vi.fn().mockResolvedValue('U1234567'),
  } as unknown as IBClient;
}

describe('SessionManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isReadOnly returns true for /portfolio/* paths', () => {
    const client = createMockIBClient();
    const sm = new SessionManager(client, 60000, 300000);

    expect(sm.isReadOnly('/portfolio/U1234567/summary')).toBe(true);
    expect(sm.isReadOnly('/portfolio/U1234567/positions/0')).toBe(true);
    expect(sm.isReadOnly('/portfolio/U1234567/allocation')).toBe(true);
    expect(sm.isReadOnly('/portfolio/U1234567/ledger')).toBe(true);

    sm.stop();
  });

  it('isReadOnly returns false for /iserver/marketdata/* paths', () => {
    const client = createMockIBClient();
    const sm = new SessionManager(client, 60000, 300000);

    expect(sm.isReadOnly('/iserver/marketdata/snapshot')).toBe(false);
    expect(sm.isReadOnly('/iserver/marketdata/history')).toBe(false);
    expect(sm.isReadOnly('/iserver/account/orders')).toBe(false);

    sm.stop();
  });

  it('isReadOnly returns true for /iserver/secdef/* and /iserver/contract/*/info', () => {
    const client = createMockIBClient();
    const sm = new SessionManager(client, 60000, 300000);

    expect(sm.isReadOnly('/iserver/secdef/search')).toBe(true);
    expect(sm.isReadOnly('/iserver/secdef/strikes')).toBe(true);
    expect(sm.isReadOnly('/iserver/contract/265598/info')).toBe(true);
    expect(sm.isReadOnly('/trsrv/stocks')).toBe(true);

    sm.stop();
  });

  it('ensureBrokerageSession calls /iserver/auth/ssodh/init', async () => {
    const client = createMockIBClient();
    const sm = new SessionManager(client, 60000, 300000);

    await sm.ensureBrokerageSession();

    expect(client.post).toHaveBeenCalledWith('/iserver/auth/ssodh/init');

    sm.stop();
  });
});
