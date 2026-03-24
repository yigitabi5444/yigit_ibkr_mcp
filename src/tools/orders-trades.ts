import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

export function registerOrdersTradesTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_live_orders', {
    title: 'Get Live Orders',
    description: 'List all currently live/working orders. Requires brokerage session (auto-acquired, auto-releases after idle).',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get('/iserver/account/orders');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_order_status', {
    title: 'Get Order Status',
    description: 'Get detailed status of a specific order. Requires brokerage session (auto-acquired, auto-releases after idle).',
    inputSchema: {
      orderId: z.string().describe('Order ID to check status for'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ orderId }) => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get(`/iserver/account/order/status/${orderId}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_trades', {
    title: 'Get Trades',
    description: 'Get trade execution history (current day + 6 previous days). Requires brokerage session (auto-acquired, auto-releases after idle).',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get('/iserver/account/trades');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
