import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

export function registerPortfolioTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_positions', {
    title: 'Get Positions',
    description: 'Get all open positions for an account. Auto-paginates through all pages. Returns stocks, options, futures, etc. Each position includes: symbol, quantity, avg cost, market value, unrealized P&L, daily P&L. Option positions also include: strike, right (C/P), expiry, multiplier.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const id = accountId || await client.getDefaultAccountId();

      // Helper: fetch all pages
      const fetchAllPages = async (): Promise<Record<string, unknown>[]> => {
        const all: Record<string, unknown>[] = [];
        let pageId = 0;
        while (true) {
          const page = await client.get<Record<string, unknown>[]>(`/portfolio/${id}/positions/${pageId}`);
          if (!page || !Array.isArray(page) || page.length === 0) break;
          all.push(...page);
          pageId++;
        }
        return all;
      };

      let allPositions = await fetchAllPages();

      // IB CP API warmup: first call after gateway start may return null option fields.
      // Detect and retry once after a short delay.
      const hasNullOptionFields = allPositions.some(
        (p) => p.assetClass === 'OPT' && (!p.expiry || !p.putOrCall || p.strike === 0 || p.strike === '0'),
      );
      if (hasNullOptionFields) {
        await new Promise((r) => setTimeout(r, 300));
        allPositions = await fetchAllPages();
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: allPositions.length, positions: allPositions }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_position_by_conid', {
    title: 'Get Position by Contract ID',
    description: 'Get a specific position by contract ID (conid). Returns position details including quantity, avg cost, market value, unrealized P&L, and daily P&L.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the security'),
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, accountId }) => {
    try {
      const id = accountId || await client.getDefaultAccountId();
      const data = await client.get(`/portfolio/${id}/position/${conid}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
