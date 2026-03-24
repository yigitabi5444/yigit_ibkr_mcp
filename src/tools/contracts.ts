import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

export function registerContractTools(server: McpServer, client: IBClient): void {
  server.registerTool('search_contracts', {
    title: 'Search Contracts',
    description: 'Search for securities by symbol or company name. Returns contract IDs (conids), symbol, exchange, security type, and description. Use the returned conid with other tools.',
    inputSchema: {
      symbol: z.string().describe('Symbol or company name to search for'),
      secType: z.enum(['STK', 'OPT', 'FUT', 'CASH', 'IND', 'CFD', 'WAR', 'BOND', 'FUND', 'CMDTY']).optional().describe('Security type filter'),
      isName: z.boolean().optional().describe('Set to true to search by company name instead of symbol'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbol, secType, isName }) => {
    try {
      const body: Record<string, unknown> = { symbol };
      if (secType) body.secType = secType;
      if (isName) body.name = true;
      const data = await client.post('/iserver/secdef/search', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_contract_details', {
    title: 'Get Contract Details',
    description: 'Get full contract details for a known contract ID (conid). Returns exchange, currency, trading hours, tick size, and other specs.',
    inputSchema: {
      conid: z.number().describe('Contract ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid }) => {
    try {
      const data = await client.get(`/iserver/contract/${conid}/info`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_stock_contracts', {
    title: 'Get Stock Contracts',
    description: 'Look up stock contracts by symbol across all exchanges. Returns available contract variants with exchange and conid.',
    inputSchema: {
      symbols: z.array(z.string()).min(1).max(10).describe('Array of stock symbols (e.g. ["AAPL", "MSFT"])'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbols }) => {
    try {
      const data = await client.get('/trsrv/stocks', { symbols: symbols.join(',') });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_futures_contracts', {
    title: 'Get Futures Contracts',
    description: 'Look up non-expired futures contracts by underlying symbol.',
    inputSchema: {
      symbols: z.array(z.string()).min(1).max(10).describe('Array of underlying symbols (e.g. ["ES", "NQ"])'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbols }) => {
    try {
      const data = await client.get('/trsrv/futures', { symbols: symbols.join(',') });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
