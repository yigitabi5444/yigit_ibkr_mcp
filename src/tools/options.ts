import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

interface StrikesResponse { call?: number[]; put?: number[] }
interface SecDefInfoItem { conid?: number; strike?: number; right?: string; month?: string; [key: string]: unknown }

export function registerOptionsTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_option_chain', {
    title: 'Get Option Chain',
    description: 'Get the full option chain for an underlying security. Composite tool: (1) fetches strike prices, (2) fetches option conids per strike/right. Returns structured data with strikes and put/call conids. Use conids with get_market_snapshot for IV/greeks.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the underlying security'),
      month: z.string().optional().describe('Expiration month (e.g. "JAN25", "FEB25"). If omitted, returns nearest.'),
      exchange: z.string().optional().describe('Exchange filter (e.g. "SMART")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, month, exchange }) => {
    try {
      const strikesParams: Record<string, string | number | boolean | undefined> = {
        conid, sectype: 'OPT',
      };
      if (month) strikesParams.month = month;
      if (exchange) strikesParams.exchange = exchange;

      const strikes = await client.get<StrikesResponse>('/iserver/secdef/strikes', strikesParams);
      if (!strikes || (!strikes.call?.length && !strikes.put?.length)) {
        return { content: [{ type: 'text', text: JSON.stringify({ message: 'No option strikes found.', params: strikesParams }, null, 2) }] };
      }

      // Fetch option conids for each strike/right
      const allStrikes = new Set([...(strikes.call || []), ...(strikes.put || [])]);
      const optionContracts: SecDefInfoItem[] = [];

      for (const right of ['C', 'P'] as const) {
        for (const strike of allStrikes) {
          try {
            const info = await client.get<SecDefInfoItem[]>('/iserver/secdef/info', {
              conid, sectype: 'OPT', month: month || '', strike, right,
            });
            if (Array.isArray(info)) optionContracts.push(...info);
          } catch { /* skip individual failures */ }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            underlying_conid: conid,
            month: month || 'nearest',
            strikes: { call: strikes.call || [], put: strikes.put || [] },
            contracts: optionContracts,
            total_contracts: optionContracts.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_option_strikes', {
    title: 'Get Option Strikes',
    description: 'Get available strike prices for options on an underlying security for a specific expiration month.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the underlying security'),
      month: z.string().describe('Expiration month (e.g. "JAN25", "FEB25")'),
      exchange: z.string().optional().describe('Exchange filter'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, month, exchange }) => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        conid, sectype: 'OPT', month,
      };
      if (exchange) params.exchange = exchange;
      const data = await client.get('/iserver/secdef/strikes', params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
