import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerAccountTools } from '../../../src/tools/account.js';

describe('Account Tools', () => {
  it('get_accounts returns account list', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      accounts: ['U1234567'],
      selectedAccount: 'U1234567',
    });

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerAccountTools(server, client);

    const handler = getToolHandler(server, 'get_accounts');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.accounts).toEqual(['U1234567']);
    expect(data.selectedAccount).toBe('U1234567');
  });

  it('get_account_summary returns curated fields', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        netliquidation: { amount: 100000, currency: 'USD', isNull: false },
        totalcashvalue: { amount: 50000, currency: 'USD', isNull: false },
        buyingpower: { amount: 200000, currency: 'USD', isNull: false },
        grosspositionvalue: { amount: 75000, currency: 'USD', isNull: false },
      })
      .mockResolvedValueOnce({ USD: { cashBalance: 50000 } });

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerAccountTools(server, client);

    const handler = getToolHandler(server, 'get_account_summary');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.netliquidation).toBe(100000);
    expect(data.totalcashvalue).toBe(50000);
    expect(data.buyingpower).toBe(200000);
    expect(data.cashByurrency.USD.cashBalance).toBe(50000);
  });

  it('get_account_allocation returns allocation data', async () => {
    const { client } = createMockClient();
    const allocation = {
      assetClass: { long: { STK: 60, OPT: 20, CASH: 20 } },
    };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(allocation);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerAccountTools(server, client);

    const handler = getToolHandler(server, 'get_account_allocation');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.assetClass.long.STK).toBe(60);
  });

  it('get_account_summary uses provided accountId', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerAccountTools(server, client);

    const handler = getToolHandler(server, 'get_account_summary');
    await handler({ accountId: 'U9999999' });

    expect(client.get).toHaveBeenCalledWith('/portfolio/U9999999/summary');
    expect(client.get).toHaveBeenCalledWith('/portfolio/U9999999/ledger');
  });
});
