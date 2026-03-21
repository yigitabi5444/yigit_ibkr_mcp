import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';
import { EventName } from '@stoqey/ib';

let nextReqId = 50000;

function getReqId(): number {
  return nextReqId++;
}

export function registerNewsTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_news_providers', {
    title: 'Get News Providers',
    description: 'List available news providers subscribed in your IB account.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const providers = await new Promise<Array<{ code: string; name: string }>>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout waiting for news providers')), 10000);

        conn.rawIb.once(EventName.newsProviders, (providers: Array<{ code: string; name: string }>) => {
          clearTimeout(timeoutId);
          resolve(providers);
        });

        conn.rawIb.reqNewsProviders();
      });

      return { content: [{ type: 'text', text: JSON.stringify(providers, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_news_headlines', {
    title: 'Get News Headlines',
    description: 'Get historical news headlines for a contract. Requires news data subscription in IB account.',
    inputSchema: {
      conid: z.number().describe('Contract ID to get news for'),
      providerCodes: z.string().optional().describe('Comma-separated provider codes (e.g. "BRFG,DJNL"). If omitted, uses all subscribed providers.'),
      startDate: z.string().optional().describe('Start date/time (YYYY-MM-DD HH:MM:SS format)'),
      endDate: z.string().optional().describe('End date/time (YYYY-MM-DD HH:MM:SS format)'),
      maxResults: z.number().optional().describe('Maximum number of headlines (default 10)'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, providerCodes, startDate, endDate, maxResults }) => {
    try {
      const reqId = getReqId();
      const headlines: Array<{ time: string; providerCode: string; articleId: string; headline: string }> = [];

      const result = await new Promise<typeof headlines>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          conn.rawIb.removeAllListeners(EventName.historicalNews);
          conn.rawIb.removeAllListeners(EventName.historicalNewsEnd);
          resolve(headlines); // Return what we have on timeout
        }, 15000);

        conn.rawIb.on(EventName.historicalNews, (id: number, time: string, providerCode: string, articleId: string, headline: string) => {
          if (id === reqId) {
            headlines.push({ time, providerCode, articleId, headline });
          }
        });

        conn.rawIb.once(EventName.historicalNewsEnd, (id: number, hasMore: boolean) => {
          if (id === reqId) {
            clearTimeout(timeoutId);
            conn.rawIb.removeAllListeners(EventName.historicalNews);
            resolve(headlines);
          }
        });

        conn.rawIb.reqHistoricalNews(
          reqId,
          conid,
          providerCodes || '',
          startDate || '',
          endDate || '',
          maxResults || 10,
          [],
        );
      });

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_news_article', {
    title: 'Get News Article',
    description: 'Get the full text of a specific news article by provider code and article ID.',
    inputSchema: {
      providerCode: z.string().describe('News provider code (e.g. "BRFG")'),
      articleId: z.string().describe('Article ID from get_news_headlines'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ providerCode, articleId }) => {
    try {
      const reqId = getReqId();

      const article = await new Promise<{ type: number; text: string }>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout waiting for news article')), 15000);

        conn.rawIb.once(EventName.newsArticle, (id: number, articleType: number, articleText: string) => {
          if (id === reqId) {
            clearTimeout(timeoutId);
            resolve({ type: articleType, text: articleText });
          }
        });

        conn.rawIb.reqNewsArticle(reqId, providerCode, articleId, []);
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            providerCode,
            articleId,
            articleType: article.type === 0 ? 'text' : 'html',
            content: article.text,
          }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
