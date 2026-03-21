import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

export function registerPnlTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_pnl', {
    title: 'Get P&L',
    description: 'Get account-level profit and loss data: daily P&L (dpl), unrealized P&L (upl), net liquidity (nl), and excess liquidity (el). Rate-limited to 1 request per 5 seconds.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      // Ensure we have the right account selected
      if (accountId) {
        await client.post('/iserver/account', { acctId: accountId });
      }
      const data = await client.get('/iserver/account/pnl/partitioned');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_performance', {
    title: 'Get Performance',
    description: 'Get historical account performance including NAV (Net Asset Value) and time-weighted returns over a configurable period.',
    inputSchema: {
      accountIds: z.array(z.string()).min(1).describe('Array of account IDs to get performance for'),
      period: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', 'YTD']).describe('Performance period'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountIds, period }) => {
    try {
      const data = await client.post('/pa/performance', {
        acctIds: accountIds,
        freq: period,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_transaction_history', {
    title: 'Get Transaction History',
    description: 'Get transaction history for accounts with optional filters for number of days, currency, and transaction type.',
    inputSchema: {
      accountIds: z.array(z.string()).min(1).describe('Array of account IDs'),
      days: z.number().min(1).max(90).optional().describe('Number of days to look back (1-90)'),
      currency: z.string().optional().describe('Filter by currency (e.g. USD, EUR)'),
      type: z.string().optional().describe('Filter by transaction type (e.g. BUY, SELL, DIV, INTEREST)'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountIds, days, currency, type }) => {
    try {
      const body: Record<string, unknown> = { acctIds: accountIds };
      if (days) body.days = days;
      if (currency) body.currency = currency;
      if (type) body.type = type;

      const data = await client.post('/pa/transactions', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
