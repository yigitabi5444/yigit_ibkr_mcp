import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

// Default snapshot fields: price, volume, fundamentals, P&L
const DEFAULT_FIELDS = [
  '31',   // Last Price
  '84',   // Bid
  '85',   // Ask Size
  '86',   // Ask
  '87',   // Volume
  '88',   // Bid Size
  '70',   // High
  '71',   // Low
  '82',   // Change
  '83',   // Change %
  '7295', // Open
  '7296', // Close
  '74',   // Avg Price
  '7290', // P/E Ratio
  '7291', // EPS
  '7287', // Dividend Yield %
  '7286', // Dividend Amount
  '7289', // Market Cap
  '7293', // 52-Week High
  '7294', // 52-Week Low
  '7633', // Implied Volatility
  '72',   // Position
  '73',   // Market Value
  '75',   // Unrealized P&L
  '78',   // Daily P&L
];

export function registerMarketDataTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_market_snapshot', {
    title: 'Get Market Snapshot',
    description: `Get real-time market data snapshot with deep fundamentals for one or more contracts. Default fields include: last/bid/ask/volume/open/high/low/close, change/change%, P/E ratio, EPS, dividend yield, dividend amount, market cap, 52-week high/low, implied volatility, position size, unrealized P&L, daily P&L. Auto-retries on first-call warmup (IB returns empty data on first request for a new contract).

Common field codes: 31=Last, 84=Bid, 86=Ask, 87=Volume, 7290=P/E, 7291=EPS, 7287=DivYield%, 7289=MarketCap, 7293=52wkHigh, 7294=52wkLow, 7633=IV`,
    inputSchema: {
      conids: z.array(z.number()).min(1).max(50).describe('Array of contract IDs (conids) to get quotes for'),
      fields: z.array(z.string()).optional().describe('Custom field codes to request. If omitted, returns all default fields including fundamentals.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conids, fields }) => {
    try {
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
          await new Promise((resolve) => setTimeout(resolve, 500));
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
    description: 'Get historical OHLCV price bars for a contract. Supports various periods (1d to 5y) and bar sizes (1min to 1month). Limited to 5 concurrent requests.',
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
      const params: Record<string, string | number | boolean | undefined> = {
        conid,
        period,
        bar,
      };
      if (outsideRth !== undefined) params.outsideRth = outsideRth;
      if (exchange) params.exchange = exchange;

      const data = await client.get('/iserver/marketdata/history', params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
