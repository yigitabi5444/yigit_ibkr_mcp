import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('Config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads default config', () => {
    const config = loadConfig();
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(4001);
    expect(config.clientId).toBe(0);
    expect(config.marketDataType).toBe(3);
    expect(config.timeoutMs).toBe(15000);
    expect(config.accountId).toBeUndefined();
  });

  it('loads config from env', () => {
    vi.stubEnv('IBKR_HOST', '192.168.1.100');
    vi.stubEnv('IBKR_PORT', '7497');
    vi.stubEnv('IBKR_CLIENT_ID', '5');
    vi.stubEnv('IBKR_ACCOUNT_ID', 'DU123456');
    vi.stubEnv('IBKR_MARKET_DATA_TYPE', '1');
    vi.stubEnv('IBKR_TIMEOUT_MS', '30000');

    const config = loadConfig();
    expect(config.host).toBe('192.168.1.100');
    expect(config.port).toBe(7497);
    expect(config.clientId).toBe(5);
    expect(config.accountId).toBe('DU123456');
    expect(config.marketDataType).toBe(1);
    expect(config.timeoutMs).toBe(30000);
  });
});
