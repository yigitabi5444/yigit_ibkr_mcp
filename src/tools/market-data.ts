import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';
import { Contract, SecType, BarSizeSetting, WhatToShow } from '@stoqey/ib';

// Generic tick list for fundamentals: 165=52wk, 258=fundamentals, 106=IV
const GENERIC_TICK_LIST = '100,101,104,106,165,258';

const BAR_SIZE_MAP: Record<string, BarSizeSetting> = {
  '1min': BarSizeSetting.MINUTES_ONE,
  '2min': BarSizeSetting.MINUTES_TWO,
  '5min': BarSizeSetting.MINUTES_FIVE,
  '15min': BarSizeSetting.MINUTES_FIFTEEN,
  '30min': BarSizeSetting.MINUTES_THIRTY,
  '1h': BarSizeSetting.HOURS_ONE,
  '2h': BarSizeSetting.HOURS_TWO,
  '4h': BarSizeSetting.HOURS_FOUR,
  '1d': BarSizeSetting.DAYS_ONE,
  '1w': BarSizeSetting.WEEKS_ONE,
  '1m': BarSizeSetting.MONTHS_ONE,
};

const DURATION_MAP: Record<string, string> = {
  '1d': '1 D', '2d': '2 D', '3d': '3 D', '5d': '5 D',
  '1w': '1 W', '2w': '2 W',
  '1m': '1 M', '3m': '3 M', '6m': '6 M',
  '1y': '1 Y', '2y': '2 Y', '5y': '5 Y',
};

export function registerMarketDataTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_market_snapshot', {
    title: 'Get Market Snapshot',
    description: 'Get real-time market data snapshot for one or more contracts. Includes fundamentals (P/E, EPS, div yield, market cap, 52-week range, IV) when available. Pass contract IDs (conids) to get quotes.',
    inputSchema: {
      conids: z.array(z.number()).min(1).max(50).describe('Array of contract IDs to get quotes for'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conids }) => {
    try {
      const results = [];

      for (const conid of conids) {
        const contract: Contract = { conId: conid, exchange: 'SMART' } as Contract;
        try {
          const ticks = await conn.ib.getMarketDataSnapshot(contract, GENERIC_TICK_LIST, false);
          const snapshot: Record<string, unknown> = { conId: conid };

          if (Array.isArray(ticks)) {
            for (const tick of ticks) {
              const t = tick as { tickType: number; value: unknown };
              snapshot[`tick_${t.tickType}`] = t.value;
            }
          }

          results.push(snapshot);
        } catch (err) {
          results.push({ conId: conid, error: (err as Error).message });
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_price_history', {
    title: 'Get Price History',
    description: 'Get historical OHLCV price bars for a contract. Supports periods from 1d to 5y and bar sizes from 1min to 1month.',
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
      const contract: Contract = { conId: conid, exchange: exchange || 'SMART' } as Contract;

      const barSize = BAR_SIZE_MAP[bar];
      if (!barSize) {
        return { content: [{ type: 'text', text: `Error: Invalid bar size "${bar}". Valid: ${Object.keys(BAR_SIZE_MAP).join(', ')}` }], isError: true };
      }

      const duration = DURATION_MAP[period];
      if (!duration) {
        return { content: [{ type: 'text', text: `Error: Invalid period "${period}". Valid: ${Object.keys(DURATION_MAP).join(', ')}` }], isError: true };
      }

      // getHistoricalData returns Promise<Bar[]> directly
      const bars = await conn.ib.getHistoricalData(
        contract,
        '',          // endDateTime: empty = now
        duration,
        barSize,
        WhatToShow.TRADES,
        outsideRth ? 0 : 1,  // useRTH: inverted logic
        2,           // formatDate: 2 = epoch seconds
      );

      return { content: [{ type: 'text', text: JSON.stringify(bars, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_exchange_rate', {
    title: 'Get Exchange Rate',
    description: 'Get the current exchange rate between two currencies.',
    inputSchema: {
      source: z.string().describe('Source currency (e.g. "USD")'),
      target: z.string().describe('Target currency (e.g. "EUR")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ source, target }) => {
    try {
      const contract: Contract = {
        symbol: source,
        secType: SecType.CASH,
        currency: target,
        exchange: 'IDEALPRO',
      } as Contract;

      const ticks = await conn.ib.getMarketDataSnapshot(contract, '', false);
      const snapshot: Record<string, unknown> = { pair: `${source}/${target}` };

      if (Array.isArray(ticks)) {
        for (const tick of ticks) {
          const t = tick as { tickType: number; value: unknown };
          snapshot[`tick_${t.tickType}`] = t.value;
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
