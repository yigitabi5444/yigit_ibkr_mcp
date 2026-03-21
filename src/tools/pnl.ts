import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';

export function registerPnlTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_pnl', {
    title: 'Get P&L',
    description: 'Get account-level profit and loss data: daily P&L, unrealized P&L, and realized P&L. Streams real-time data from the TWS API.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const id = accountId || await conn.getAccountId();
      const pnl = await conn.subscribeFirst(conn.ib.getPnL(id, ''));
      return { content: [{ type: 'text', text: JSON.stringify({ accountId: id, ...pnl as object }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
