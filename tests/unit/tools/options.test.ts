import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerOptionsTools } from '../../../src/tools/options.js';

describe('Options Tools', () => {
  it('get_option_chain fetches strikes then secdef info for each', async () => {
    const { client } = createMockClient();
    const strikes = { call: [170, 175], put: [170, 175] };

    (client.get as ReturnType<typeof vi.fn>)
      // First call: strikes
      .mockResolvedValueOnce(strikes)
      // Then secdef/info calls for C@170, C@175, P@170, P@175
      .mockResolvedValueOnce([{ conid: 1001, strike: 170, right: 'C' }])
      .mockResolvedValueOnce([{ conid: 1002, strike: 175, right: 'C' }])
      .mockResolvedValueOnce([{ conid: 2001, strike: 170, right: 'P' }])
      .mockResolvedValueOnce([{ conid: 2002, strike: 175, right: 'P' }]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, client);

    const handler = getToolHandler(server, 'get_option_chain');
    const result = await handler({ conid: 265598 });
    const data = JSON.parse(result.content[0].text);

    expect(data.underlying_conid).toBe(265598);
    expect(data.strikes.call).toEqual([170, 175]);
    expect(data.strikes.put).toEqual([170, 175]);
    expect(data.total_contracts).toBe(4);
    expect(data.contracts[0].conid).toBe(1001);
  });

  it('get_option_chain returns message when no strikes found', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({ call: [], put: [] });

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, client);

    const handler = getToolHandler(server, 'get_option_chain');
    const result = await handler({ conid: 265598 });
    const data = JSON.parse(result.content[0].text);

    expect(data.message).toBe('No option strikes found.');
  });

  it('get_option_strikes returns call and put strikes', async () => {
    const { client } = createMockClient();
    const strikesData = { call: [170, 175, 180, 185], put: [170, 175, 180, 185] };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(strikesData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, client);

    const handler = getToolHandler(server, 'get_option_strikes');
    const result = await handler({ conid: 265598, month: 'JAN25' });
    const data = JSON.parse(result.content[0].text);

    expect(data.call).toEqual([170, 175, 180, 185]);
    expect(data.put).toEqual([170, 175, 180, 185]);
    expect(client.get).toHaveBeenCalledWith('/iserver/secdef/strikes', {
      conid: 265598,
      sectype: 'OPT',
      month: 'JAN25',
    });
  });
});
