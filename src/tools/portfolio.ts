import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';

export function registerPortfolioTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_positions', {
    title: 'Get Positions',
    description: 'Get all open positions across all accounts. Returns stocks, options, futures, etc. Each position includes: symbol, quantity, avg cost, market value, unrealized P&L, asset class. Option positions include: strike, right (C/P), expiry, multiplier.',
    inputSchema: {
      accountId: z.string().optional().describe('Filter by account ID. If omitted, returns all accounts.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const positionsUpdate = await conn.subscribeFirst(conn.ib.getPositions());
      const positions: Array<Record<string, unknown>> = [];

      // AccountPositionsUpdate.all is ReadonlyMap<AccountId, Position[]>
      if (positionsUpdate?.all) {
        for (const [acct, acctPositions] of positionsUpdate.all) {
          if (accountId && acct !== accountId) continue;
          for (const pos of acctPositions) {
            const contract = pos.contract;
            positions.push({
              account: pos.account,
              conId: contract?.conId,
              symbol: contract?.symbol,
              secType: contract?.secType,
              exchange: contract?.exchange,
              currency: contract?.currency,
              localSymbol: contract?.localSymbol,
              position: pos.pos,
              avgCost: pos.avgCost,
              marketPrice: pos.marketPrice,
              marketValue: pos.marketValue,
              unrealizedPNL: pos.unrealizedPNL,
              realizedPNL: pos.realizedPNL,
              // Option-specific fields
              ...(contract?.secType === 'OPT' || contract?.secType === 'FOP' ? {
                strike: contract?.strike,
                right: contract?.right,
                lastTradeDateOrContractMonth: contract?.lastTradeDateOrContractMonth,
                multiplier: contract?.multiplier,
              } : {}),
            });
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: positions.length, positions }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_position_by_conid', {
    title: 'Get Position by Contract ID',
    description: 'Get a specific position by contract ID (conId). Returns position details including quantity, avg cost, and contract info.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the security'),
      accountId: z.string().optional().describe('Account ID. Uses default if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, accountId }) => {
    try {
      const id = accountId || await conn.getAccountId();
      const positionsUpdate = await conn.subscribeFirst(conn.ib.getPositions());

      if (positionsUpdate?.all) {
        const acctPositions = positionsUpdate.all.get(id);
        if (acctPositions) {
          const match = acctPositions.find((p) => p.contract?.conId === conid);
          if (match) {
            return { content: [{ type: 'text', text: JSON.stringify(match, null, 2) }] };
          }
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify({ error: `No position found for conId ${conid}` }) }], isError: true };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
