import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { of } from 'rxjs';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerAccountTools } from '../../../src/tools/account.js';

describe('Account Tools', () => {
  it('get_accounts returns managed accounts', async () => {
    const { conn, mockApi } = createMockConnection();
    mockApi.getManagedAccounts.mockResolvedValue(['U1234567', 'U7654321']);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerAccountTools(server, conn);

    const handler = getToolHandler(server, 'get_accounts');

    const result = await handler({});
    const data = JSON.parse(result.content[0].text);
    expect(data.accounts).toEqual(['U1234567', 'U7654321']);
  });

  it('get_account_summary returns account data', async () => {
    const { conn } = createMockConnection();

    // Mock the subscribeFirst to return account summary data
    const summaryData = {
      all: new Map([
        ['U1234567', new Map([
          ['NetLiquidation', new Map([['USD', { value: '100000', ingressTm: 0 }]])],
          ['TotalCashValue', new Map([['USD', { value: '50000', ingressTm: 0 }]])],
          ['BuyingPower', new Map([['USD', { value: '200000', ingressTm: 0 }]])],
        ])],
      ]),
    };

    (conn.subscribeFirst as ReturnType<typeof vi.fn>).mockResolvedValue(summaryData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerAccountTools(server, conn);

    const handler = getToolHandler(server, 'get_account_summary');

    const result = await handler({});
    const data = JSON.parse(result.content[0].text);
    expect(data.accountId).toBe('U1234567');
    expect(data.NetLiquidation).toBe('100000');
    expect(data.TotalCashValue).toBe('50000');
  });
});
