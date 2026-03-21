import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

export function registerCurrencyTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_exchange_rate', {
    title: 'Get Exchange Rate',
    description: 'Get the current exchange rate between two currencies.',
    inputSchema: {
      source: z.string().describe('Source currency (e.g. "USD")'),
      target: z.string().describe('Target currency (e.g. "EUR")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ source, target }) => {
    try {
      const data = await client.get('/iserver/exchangerate', { source, target });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
