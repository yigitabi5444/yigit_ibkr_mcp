import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

const DEFAULT_FIELDS = [
  '31', '84', '85', '86', '87', '88', '70', '71', '82', '83',
  '7295', '7296', '74',
  '7290', '7291', '7287', '7286', '7289', '7293', '7294', '7633',
  '72', '73', '75', '78',
];

export function registerMarketDataTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_market_snapshot', {
    title: 'Get Market Snapshot',
    description: `Get real-time market data snapshot with deep fundamentals. Default fields include: last/bid/ask/volume/OHLC, change/change%, P/E ratio, EPS, dividend yield, market cap, 52-week high/low, implied volatility, position size, unrealized P&L, daily P&L. Auto-retries on first-call warmup. Requires brokerage session (auto-acquired, auto-releases after idle).`,
    inputSchema: {
      conids: z.array(z.number()).min(1).max(50).describe('Array of contract IDs to get quotes for'),
      fields: z.array(z.string()).optional().describe('Custom field codes. If omitted, returns all default fields including fundamentals.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conids, fields }) => {
    try {
      await sessionManager.ensureBrokerageSession();
      const fieldList = fields || DEFAULT_FIELDS;
      const params = {
        conids: conids.join(','),
        fields: fieldList.join(','),
      };

      let data = await client.get<Record<string, unknown>[]>('/iserver/marketdata/snapshot', params);

      // IB warmup: first call for a new conid may return empty data. Retry once.
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        const hasData = Object.keys(firstItem).some(
          (k) => k !== 'conid' && k !== 'conidEx' && k !== 'server_id' && firstItem[k] !== '',
        );
        if (!hasData) {
          await new Promise((r) => setTimeout(r, 500));
          data = await client.get<Record<string, unknown>[]>('/iserver/marketdata/snapshot', params);
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_price_history', {
    title: 'Get Price History',
    description: 'Get historical OHLCV price bars for a contract. Supports various periods and bar sizes. Requires brokerage session (auto-acquired, auto-releases after idle).',
    inputSchema: {
      conid: z.number().describe('Contract ID'),
      period: z.string().describe('Time period: 1d, 2d, 3d, 5d, 1w, 2w, 1m, 3m, 6m, 1y, 2y, 5y'),
      bar: z.string().describe('Bar size: 1min, 2min, 5min, 15min, 30min, 1h, 2h, 4h, 1d, 1w, 1m'),
      outsideRth: z.boolean().optional().describe('Include data outside regular trading hours'),
      exchange: z.string().optional().describe('Exchange filter'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, period, bar, outsideRth, exchange }) => {
    try {
      await sessionManager.ensureBrokerageSession();
      const params: Record<string, string | number | boolean | undefined> = { conid, period, bar };
      if (outsideRth !== undefined) params.outsideRth = outsideRth;
      if (exchange) params.exchange = exchange;

      const data = await client.get('/iserver/marketdata/history', params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
