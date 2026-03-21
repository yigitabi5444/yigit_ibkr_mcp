import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

export function registerAccountTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_accounts', {
    title: 'Get Accounts',
    description: 'List all brokerage accounts with IDs and capabilities. Returns account IDs that can be used with other tools.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const data = await client.get('/iserver/accounts');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_account_summary', {
    title: 'Get Account Summary',
    description: 'Get comprehensive account summary: balances, margin requirements, buying power, net liquidation value, and cash breakdown by currency. Merges portfolio summary and ledger data into one response.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const id = accountId || await client.getDefaultAccountId();
      const [summary, ledger] = await Promise.all([
        client.get(`/portfolio/${id}/summary`),
        client.get(`/portfolio/${id}/ledger`),
      ]);
      return { content: [{ type: 'text', text: JSON.stringify({ summary, ledger }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_account_allocation', {
    title: 'Get Account Allocation',
    description: 'Get asset class allocation breakdown showing distribution across stocks, options, futures, cash, bonds, etc. as percentages and values.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const id = accountId || await client.getDefaultAccountId();
      const data = await client.get(`/portfolio/${id}/allocation`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
