import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

// Default fields: price + volume + fundamentals (when available) + position P&L
const DEFAULT_FIELDS = [
  '55',   // symbol
  '31', '84', '85', '86', '87', '88', '70', '71', '82', '83',
  '7295', '7296', '74',
  // Fundamentals (require market data subscription — returned when available)
  '7290', '7291', '7287', '7286', '7289', '7633',
  // 52-week range + sector/industry
  '7293', '7294', '7280', '7281', '7282',
  // Growth & performance
  '7283', '7284', '7724',
  // Price bands (Bollinger-style)
  '7674', '7675', '7676', '7677', '7678', '7679',
  // Position P&L
  '72', '73', '75', '78',
];

// Map ALL known IB field codes to readable names
const FIELD_NAMES: Record<string, string> = {
  // Identity
  '55': 'symbol', 'conid': 'conid',
  // Price
  '31': 'lastPrice', '84': 'bid', '85': 'askSize', '86': 'ask',
  '88': 'bidSize', '70': 'high', '71': 'low',
  '82': 'change', '83': 'changePercent',
  '7295': 'open', '7296': 'close', '74': 'avgPrice',
  // Volume
  '87': 'volume', '7282': 'avgVolume',
  // Fundamentals (subscription-dependent)
  '7290': 'peRatio', '7291': 'eps',
  '7287': 'dividendYieldPct', '7286': 'dividendAmount',
  '7289': 'marketCap', '7633': 'impliedVolatility',
  // 52-week range
  '7293': 'week52High', '7294': 'week52Low', '7724': 'changeFrom52wkHighPct',
  // Sector/Industry
  '7280': 'sector', '7281': 'industry',
  // Growth
  '7283': 'revenueGrowthPct', '7284': 'epsGrowthPct',
  // Price bands (10-day & 30-day)
  '7674': 'lowPrice10d', '7675': 'highPrice10d',
  '7676': 'highPrice30d', '7677': 'lowPrice30d',
  '7678': 'changePct10d', '7679': 'changePct30d',
  // Exchange info
  '7219': 'contractSymbol', '7221': 'listingExchange',
  // Position P&L
  '72': 'positionSize', '73': 'marketValue',
  '75': 'unrealizedPnl', '78': 'dailyPnl',
};

// Fields to strip from output (internal/noise)
const STRIP_FIELDS = new Set([
  '_updated', 'server_id', 'conidEx', '6119', '6508', '6509',
  '87_raw', '78_raw', '7282_raw',
]);

function humanizeSnapshot(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (STRIP_FIELDS.has(key)) continue;
    if (key.endsWith('_raw')) continue;
    const name = FIELD_NAMES[key] || key;
    result[name] = value;
  }
  return result;
}

export function registerMarketDataTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_market_snapshot', {
    title: 'Get Market Snapshot',
    description: 'Get real-time market data snapshot with human-readable field names. Returns: symbol, lastPrice, bid, ask, volume, open, high, low, close, change, changePercent, week52High, week52Low, sector, industry, avgVolume, revenueGrowthPct, epsGrowthPct, changeFrom52wkHighPct, price bands (10d/30d). Also returns peRatio, eps, dividendYieldPct, marketCap, impliedVolatility when your IB market data subscription includes them. Auto-retries on first-call warmup.',
    inputSchema: {
      conids: z.array(z.number()).min(1).max(50).describe('Array of contract IDs to get quotes for'),
      fields: z.array(z.string()).optional().describe('Custom field codes. If omitted, returns all default fields.'),
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

      // IB warmup: first call for a new conid returns sparse data. Retry once.
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        const priceFields = ['31', '84', '86', '70', '71'];
        const hasPrice = priceFields.some((f) => firstItem[f] !== undefined && firstItem[f] !== '');
        if (!hasPrice) {
          await new Promise((r) => setTimeout(r, 500));
          data = await client.get<Record<string, unknown>[]>('/iserver/marketdata/snapshot', params);
        }
      }

      const humanized = Array.isArray(data) ? data.map(humanizeSnapshot) : data;
      return { content: [{ type: 'text', text: JSON.stringify(humanized, null, 2) }] };
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
