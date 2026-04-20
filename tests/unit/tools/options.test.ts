import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerOptionsTools } from '../../../src/tools/options.js';

describe('Options Tools', () => {
  it('get_option_chain returns strikes without fetching conids', async () => {
    const { client } = createMockClient();
    const strikes = { call: [170, 175, 180, 185, 190], put: [170, 175, 180, 185, 190] };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(strikes);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, client);

    const handler = getToolHandler(server, 'get_option_chain');
    const result = await handler({ conid: 265598, month: 'MAY26' });
    const data = JSON.parse(result.content[0].text);

    expect(data.underlying_conid).toBe(265598);
    expect(data.callStrikes).toEqual([170, 175, 180, 185, 190]);
    expect(data.putStrikes).toEqual([170, 175, 180, 185, 190]);
    expect(data.totalCallStrikes).toBe(5);
    // Only 1 API call — no per-strike loop
    expect(client.get).toHaveBeenCalledTimes(1);
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

  it('get_option_contracts fetches conids for specific strikes in parallel', async () => {
    const { client } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValue([{ conid: 1001, strike: 180, right: 'C', month: 'MAY26' }]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerOptionsTools(server, client);

    const handler = getToolHandler(server, 'get_option_contracts');
    const result = await handler({ conid: 265598, month: 'MAY26', strikes: [180, 185], right: 'C' });
    const data = JSON.parse(result.content[0].text);

    expect(data.total_contracts).toBeGreaterThan(0);
    // Should call in parallel for 2 strikes
    expect(client.get).toHaveBeenCalledTimes(2);
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
  });
});
