import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerContractTools } from '../../../src/tools/contracts.js';

describe('Contract Tools', () => {
  it('search_contracts posts search body and returns results', async () => {
    const { client } = createMockClient();
    const searchResults = [
      { conid: 265598, companyHeader: 'APPLE INC', companyName: 'APPLE INC', symbol: 'AAPL', secType: 'STK' },
      { conid: 272093, companyHeader: 'MICROSOFT CORP', companyName: 'MICROSOFT', symbol: 'MSFT', secType: 'STK' },
    ];
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue(searchResults);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerContractTools(server, client);

    const handler = getToolHandler(server, 'search_contracts');
    const result = await handler({ symbol: 'AAPL' });
    const data = JSON.parse(result.content[0].text);

    expect(data).toHaveLength(2);
    expect(data[0].symbol).toBe('AAPL');
    expect(client.post).toHaveBeenCalledWith('/iserver/secdef/search', { symbol: 'AAPL' });
  });

  it('search_contracts passes secType filter', async () => {
    const { client } = createMockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerContractTools(server, client);

    const handler = getToolHandler(server, 'search_contracts');
    await handler({ symbol: 'ES', secType: 'FUT' });

    expect(client.post).toHaveBeenCalledWith('/iserver/secdef/search', { symbol: 'ES', secType: 'FUT' });
  });

  it('get_contract_details returns contract info', async () => {
    const { client } = createMockClient();
    const contractInfo = {
      conid: 265598,
      symbol: 'AAPL',
      exchange: 'NASDAQ',
      currency: 'USD',
      minTick: 0.01,
      validExchanges: 'SMART,NASDAQ,NYSE',
    };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(contractInfo);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerContractTools(server, client);

    const handler = getToolHandler(server, 'get_contract_details');
    const result = await handler({ conid: 265598 });
    const data = JSON.parse(result.content[0].text);

    expect(data.conid).toBe(265598);
    expect(data.symbol).toBe('AAPL');
    expect(data.currency).toBe('USD');
    expect(client.get).toHaveBeenCalledWith('/iserver/contract/265598/info');
  });
});
