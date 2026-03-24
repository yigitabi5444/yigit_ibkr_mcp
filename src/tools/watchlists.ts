import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

export function registerWatchlistTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_watchlists', {
    title: 'Get Watchlists',
    description: 'List saved watchlists. Requires brokerage session (auto-acquired, auto-releases after idle).',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get('/iserver/watchlist');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_watchlist', {
    title: 'Get Watchlist',
    description: 'Get contracts in a specific watchlist by ID. Requires brokerage session (auto-acquired, auto-releases after idle).',
    inputSchema: {
      id: z.string().describe('Watchlist ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get('/iserver/watchlist', { id });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
