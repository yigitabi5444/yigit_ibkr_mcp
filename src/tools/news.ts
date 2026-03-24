import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

export function registerNewsTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_news_sources', {
    title: 'Get News Sources',
    description: 'List available news sources/providers from IB.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get('/iserver/news/sources');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_news_briefing', {
    title: 'Get News Briefing',
    description: 'Get the latest market news briefing from Briefing.com. Returns a full market commentary/analysis article.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      await sessionManager.ensureBrokerageSession();
      const data = await client.get<{ provider?: string; source?: string; title?: string; content?: string }>('/iserver/news/briefing');

      // Strip HTML tags for cleaner LLM consumption
      const result: Record<string, unknown> = {};
      if (data.provider) result.provider = data.provider;
      if (data.source) result.source = data.source;
      if (data.title) result.title = data.title;
      if (data.content) {
        result.content = data.content
          .replace(/<[^>]+>/g, '')     // strip HTML tags
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n{3,}/g, '\n\n')  // collapse multiple newlines
          .trim();
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
