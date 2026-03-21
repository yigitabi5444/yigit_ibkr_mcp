import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';

export function registerOrdersTradesTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_live_orders', {
    title: 'Get Live Orders',
    description: 'List all currently live/working orders across all accounts and clients.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const orders = await conn.ib.getAllOpenOrders();
      return { content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_order_status', {
    title: 'Get Order Status',
    description: 'Get status of a specific order by order ID. Filters from all open orders.',
    inputSchema: {
      orderId: z.number().describe('Order ID to check status for'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ orderId }) => {
    try {
      const allOrders = await conn.ib.getAllOpenOrders();
      const orders = (allOrders as unknown as Array<{ order: { orderId: number }; contract: unknown; orderState: unknown }>);
      const match = orders?.find((o) => o.order?.orderId === orderId);

      if (!match) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `No open order found with ID ${orderId}` }) }], isError: true };
      }

      return { content: [{ type: 'text', text: JSON.stringify(match, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_trades', {
    title: 'Get Trades',
    description: 'Get trade execution history for the current session. Returns executed trades with contract details, execution info, and commissions.',
    inputSchema: {
      symbol: z.string().optional().describe('Filter by symbol'),
      secType: z.string().optional().describe('Filter by security type (STK, OPT, FUT, etc.)'),
      side: z.string().optional().describe('Filter by side (BUY or SELL)'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbol, secType, side }) => {
    try {
      const filter: Record<string, string> = {};
      if (symbol) filter.symbol = symbol;
      if (secType) filter.secType = secType;
      if (side) filter.side = side;

      const executions = await conn.ib.getExecutionDetails(filter as never);
      return { content: [{ type: 'text', text: JSON.stringify(executions, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
