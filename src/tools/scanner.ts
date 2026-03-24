import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

let cachedScannerParams: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export function registerScannerTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_scanner_params', {
    title: 'Get Scanner Parameters',
    description: 'Get available market scanner parameters. Cached for 15 minutes. Requires brokerage session (auto-acquired, auto-releases after idle).',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      if (cachedScannerParams && Date.now() - cachedScannerParams.timestamp < CACHE_TTL_MS) {
        return { content: [{ type: 'text', text: JSON.stringify(cachedScannerParams.data, null, 2) }] };
      }
      await sessionManager.ensureBrokerageSession();
      const data = await client.get('/iserver/scanner/params');
      cachedScannerParams = { data, timestamp: Date.now() };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('run_scanner', {
    title: 'Run Scanner',
    description: 'Execute a market scanner to find securities matching specific criteria. Requires brokerage session (auto-acquired, auto-releases after idle).',
    inputSchema: {
      instrument: z.string().describe('Instrument type (e.g. "STK", "FUT.US")'),
      location: z.string().describe('Market location (e.g. "STK.US.MAJOR")'),
      type: z.string().describe('Scanner type (e.g. "TOP_PERC_GAIN", "MOST_ACTIVE")'),
      filters: z.array(z.object({
        code: z.string(), value: z.number().optional(),
        min: z.number().optional(), max: z.number().optional(),
      })).optional().describe('Optional filter criteria'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ instrument, location, type, filters }) => {
    try {
      await sessionManager.ensureBrokerageSession();
      const body: Record<string, unknown> = { instrument, location, type };
      if (filters) body.filter = filters;
      const data = await client.post('/iserver/scanner/run', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
