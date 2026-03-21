import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';

let cachedScannerParams: { data: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function registerScannerTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_scanner_params', {
    title: 'Get Scanner Parameters',
    description: 'Get available market scanner parameters including instrument types, location codes, and scan codes. Returns XML. Results are cached for 15 minutes.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      if (cachedScannerParams && Date.now() - cachedScannerParams.timestamp < CACHE_TTL_MS) {
        return { content: [{ type: 'text', text: cachedScannerParams.data }] };
      }

      const xml = await conn.ib.getScannerParameters();
      cachedScannerParams = { data: xml, timestamp: Date.now() };
      return { content: [{ type: 'text', text: xml }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('run_scanner', {
    title: 'Run Scanner',
    description: 'Execute a market scanner to find securities matching specific criteria. Use get_scanner_params first to see available options.',
    inputSchema: {
      instrument: z.string().describe('Instrument type (e.g. "STK", "FUT.US")'),
      locationCode: z.string().describe('Market location (e.g. "STK.US.MAJOR", "STK.US")'),
      scanCode: z.string().describe('Scanner type (e.g. "TOP_PERC_GAIN", "TOP_PERC_LOSE", "MOST_ACTIVE", "HIGH_DIVIDEND_YIELD")'),
      numberOfRows: z.number().optional().describe('Number of results (default 25, max 50)'),
      abovePrice: z.number().optional().describe('Minimum price filter'),
      belowPrice: z.number().optional().describe('Maximum price filter'),
      aboveVolume: z.number().optional().describe('Minimum volume filter'),
      marketCapAbove: z.number().optional().describe('Minimum market cap'),
      marketCapBelow: z.number().optional().describe('Maximum market cap'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ instrument, locationCode, scanCode, numberOfRows, abovePrice, belowPrice, aboveVolume, marketCapAbove, marketCapBelow }) => {
    try {
      const subscription: Record<string, unknown> = {
        instrument,
        locationCode,
        scanCode,
        numberOfRows: numberOfRows || 25,
      };

      if (abovePrice !== undefined) subscription.abovePrice = abovePrice;
      if (belowPrice !== undefined) subscription.belowPrice = belowPrice;
      if (aboveVolume !== undefined) subscription.aboveVolume = aboveVolume;
      if (marketCapAbove !== undefined) subscription.marketCapAbove = marketCapAbove;
      if (marketCapBelow !== undefined) subscription.marketCapBelow = marketCapBelow;

      const scannerResult = await conn.subscribeFirst(
        conn.ib.getMarketScanner(subscription as never),
      );

      return { content: [{ type: 'text', text: JSON.stringify(scannerResult, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
