import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

interface SecdefEntry {
  ticker?: string;
  name?: string;
  type?: string;
  assetClass?: string;
  currency?: string;
  countryCode?: string;
  listingExchange?: string;
  sector?: string;
  sectorGroup?: string;
  group?: string;
  hasOptions?: boolean;
  isUS?: boolean;
}

interface ContractInfo {
  company_name?: string;
  industry?: string;
  category?: string;
  cusip?: string | null;
  instrument_type?: string;
  local_symbol?: string;
}

export function registerFundamentalsTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_fundamentals', {
    title: 'Get Fundamentals',
    description: 'Get company metadata for a stock: name, sector, sectorGroup, industry, listing exchange, country, currency, asset type, options availability, CUSIP. IBKR Client Portal API does NOT expose financial statements (balance sheet, income statement, cash flow), valuation ratios (P/E, market cap, EPS), or dividend data — those fields are deprecated by IBKR. For revenue/EPS growth %, 52-week range, sector/industry from market data, use get_market_snapshot. For OHLCV history, use get_price_history.',
    inputSchema: {
      conid: z.number().describe('Contract ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid }) => {
    const result: Record<string, unknown> = { conid };
    const errors: string[] = [];

    try {
      const sd = await client.get<{ secdef?: SecdefEntry[] }>('/trsrv/secdef', { conids: conid });
      const e = sd?.secdef?.[0];
      if (e) {
        result['symbol'] = e.ticker;
        result['name'] = e.name;
        result['type'] = e.type;
        result['assetClass'] = e.assetClass;
        result['currency'] = e.currency;
        result['country'] = e.countryCode;
        result['listingExchange'] = e.listingExchange;
        result['sector'] = e.sector;
        result['sectorGroup'] = e.sectorGroup;
        result['group'] = e.group;
        result['hasOptions'] = e.hasOptions;
        result['isUS'] = e.isUS;
      }
    } catch (err) {
      errors.push(`secdef: ${(err as Error).message}`);
    }

    try {
      const info = await client.get<ContractInfo>(`/iserver/contract/${conid}/info`);
      if (info?.industry !== undefined) result['industry'] = info.industry;
      if (info?.category !== undefined) result['category'] = info.category;
      if (info?.cusip !== undefined) result['cusip'] = info.cusip;
      if (!result['name'] && info?.company_name) result['name'] = info.company_name;
      if (!result['assetClass'] && info?.instrument_type) result['assetClass'] = info.instrument_type;
    } catch (err) {
      errors.push(`contract/info: ${(err as Error).message}`);
    }

    if (errors.length) result['errors'] = errors;

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });
}
