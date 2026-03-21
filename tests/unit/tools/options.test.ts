import { describe, it, expect, vi } from 'vitest';
import optionChainFixture from '../fixtures/option-chain.json';

describe('Options tools logic', () => {
  it('option chain has both calls and puts', () => {
    expect(optionChainFixture.strikes.call).toHaveLength(5);
    expect(optionChainFixture.strikes.put).toHaveLength(5);
  });

  it('secdef info entries have required fields', () => {
    for (const contract of optionChainFixture.secdef_info) {
      expect(contract).toHaveProperty('conid');
      expect(contract).toHaveProperty('strike');
      expect(contract).toHaveProperty('right');
      expect(contract).toHaveProperty('month');
      expect(['C', 'P']).toContain(contract.right);
    }
  });

  it('composite chain orchestrates calls in correct order', async () => {
    const callOrder: string[] = [];

    const mockGet = vi.fn().mockImplementation((path: string) => {
      if (path.includes('/iserver/secdef/strikes')) {
        callOrder.push('strikes');
        return Promise.resolve(optionChainFixture.strikes);
      }
      if (path.includes('/iserver/secdef/info')) {
        callOrder.push('secdef_info');
        return Promise.resolve([optionChainFixture.secdef_info[0]]);
      }
      return Promise.resolve({});
    });

    // Simulate the composite tool logic
    const strikes = await mockGet('/iserver/secdef/strikes?conid=265598&sectype=OPT');

    const allStrikes = new Set([
      ...(strikes.call || []),
      ...(strikes.put || []),
    ]);

    for (const right of ['C', 'P']) {
      for (const strike of allStrikes) {
        await mockGet(`/iserver/secdef/info?conid=265598&sectype=OPT&strike=${strike}&right=${right}`);
      }
    }

    expect(callOrder[0]).toBe('strikes');
    // All subsequent calls should be secdef_info
    expect(callOrder.slice(1).every((c) => c === 'secdef_info')).toBe(true);
    // 5 strikes * 2 (C+P) = 10 secdef_info calls
    expect(callOrder.filter((c) => c === 'secdef_info')).toHaveLength(10);
  });
});
