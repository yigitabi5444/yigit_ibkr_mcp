import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockConnection } from '../helpers/mock-connection.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerContractTools } from '../../../src/tools/contracts.js';

describe('Contract Tools', () => {
  it('search_contracts returns matching symbols', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getMatchingSymbols.mockResolvedValue([
      { contract: { conId: 265598, symbol: 'AAPL', secType: 'STK', primaryExch: 'NASDAQ', currency: 'USD' }, derivativeSecTypes: ['OPT'] },
      { contract: { conId: 265599, symbol: 'AAPL', secType: 'STK', primaryExch: 'LSE', currency: 'GBP' }, derivativeSecTypes: [] },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerContractTools(server, conn);

    const handler = getToolHandler(server, 'search_contracts');

    const result = await handler({ symbol: 'AAPL' });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(2);
    expect(data[0].conId).toBe(265598);
    expect(data[0].symbol).toBe('AAPL');
  });

  it('search_contracts filters by secType', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getMatchingSymbols.mockResolvedValue([
      { contract: { conId: 1, symbol: 'ES', secType: 'FUT', currency: 'USD' }, derivativeSecTypes: [] },
      { contract: { conId: 2, symbol: 'ES', secType: 'IND', currency: 'USD' }, derivativeSecTypes: [] },
    ]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerContractTools(server, conn);

    const handler = getToolHandler(server, 'search_contracts');

    const result = await handler({ symbol: 'ES', secType: 'FUT' });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].secType).toBe('FUT');
  });

  it('get_contract_details returns full details', async () => {
    const { conn, mockApi } = createMockConnection();

    mockApi.getContractDetails.mockResolvedValue([{
      contract: { conId: 265598, symbol: 'AAPL', secType: 'STK', exchange: 'SMART', currency: 'USD' },
      longName: 'Apple Inc.',
      category: 'Technology',
      minTick: 0.01,
      validExchanges: 'SMART,NYSE,ARCA',
    }]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerContractTools(server, conn);

    const handler = getToolHandler(server, 'get_contract_details');

    const result = await handler({ conid: 265598 });
    const data = JSON.parse(result.content[0].text);
    expect(data[0].longName).toBe('Apple Inc.');
    expect(data[0].minTick).toBe(0.01);
  });
});
