import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

interface StrikesResponse { call?: number[]; put?: number[] }
interface SecDefInfoItem { conid?: number; strike?: number; right?: string; month?: string; [key: string]: unknown }

export function registerOptionsTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_option_chain', {
    title: 'Get Option Chain',
    description: 'Get available option expirations and strikes for an underlying security. Returns the list of strikes for calls and puts. Fast — single API call. To get conids for specific strikes, use get_option_contracts.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the underlying security'),
      month: z.string().optional().describe('Expiration month (e.g. "MAY26"). If omitted, returns nearest.'),
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

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            underlying_conid: conid,
            month: month || 'nearest',
            callStrikes: strikes.call || [],
            putStrikes: strikes.put || [],
            totalCallStrikes: (strikes.call || []).length,
            totalPutStrikes: (strikes.put || []).length,
            hint: 'Use get_option_contracts to fetch conids for specific strikes.',
          }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_option_contracts', {
    title: 'Get Option Contracts',
    description: 'Get option contract details (conids) for specific strikes. Returns conids you can use with get_market_snapshot for pricing/IV. Fetches up to 10 strikes at a time to stay fast.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the underlying security'),
      month: z.string().describe('Expiration month (e.g. "MAY26")'),
      strikes: z.array(z.number()).min(1).max(10).describe('Strike prices to look up (max 10)'),
      right: z.enum(['C', 'P']).optional().describe('Filter by call (C) or put (P). If omitted, returns both.'),
      exchange: z.string().optional().describe('Exchange filter'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, month, strikes, right, exchange }) => {
    try {
      const rights = right ? [right] : ['C', 'P'] as const;
      const contracts: SecDefInfoItem[] = [];

      // Fetch in parallel per right — max 20 calls (10 strikes × 2 rights)
      const promises: Promise<void>[] = [];
      for (const r of rights) {
        for (const strike of strikes) {
          promises.push(
            client.get<SecDefInfoItem[]>('/iserver/secdef/info', {
              conid, sectype: 'OPT', month, strike, right: r,
              ...(exchange ? { exchange } : {}),
            })
              .then((info) => { if (Array.isArray(info)) contracts.push(...info); })
              .catch(() => { /* skip individual failures */ }),
          );
        }
      }
      await Promise.all(promises);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            underlying_conid: conid,
            month,
            contracts,
            total_contracts: contracts.length,
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
      month: z.string().describe('Expiration month (e.g. "MAY26")'),
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
