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
    description: 'Get curated account summary: net liquidation, cash, buying power, margin, gross position value, P&L, and cash breakdown by currency. Returns the most important fields only — use get_account_summary_full for all 70+ fields.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const id = accountId || await client.getDefaultAccountId();
      const [rawSummary, ledger] = await Promise.all([
        client.get<Record<string, { amount: number; currency: string; isNull: boolean }>>(`/portfolio/${id}/summary`),
        client.get(`/portfolio/${id}/ledger`),
      ]);

      // Curate: pick only the fields that matter
      const pick = (key: string) => {
        const v = rawSummary?.[key];
        return v && !v.isNull ? v.amount : null;
      };

      const summary = {
        accountId: id,
        netliquidation: pick('netliquidation'),
        totalcashvalue: pick('totalcashvalue'),
        settledcash: pick('settledcash'),
        buyingpower: pick('buyingpower'),
        grosspositionvalue: pick('grosspositionvalue'),
        initmarginreq: pick('initmarginreq'),
        maintmarginreq: pick('maintmarginreq'),
        availablefunds: pick('availablefunds'),
        excessliquidity: pick('excessliquidity'),
        cushion: pick('cushion'),
        equitywithloanvalue: pick('equitywithloanvalue'),
        unrealizedpnl: pick('unrealizedpnl') ?? pick('accruedcash'),
        accrueddividend: pick('accrueddividend'),
        leverage: pick('leverage-s'),
        cashByurrency: ledger,
      };

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_account_summary_full', {
    title: 'Get Account Summary (Full)',
    description: 'Get the full raw account summary with all 70+ fields including segment-level duplicates (-s suffix). Use get_account_summary for a curated version.',
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
