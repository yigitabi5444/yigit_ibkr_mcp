#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { IBConnection } from './connection.js';
import { registerAllTools } from './tools/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const connection = new IBConnection(config);

  const server = new McpServer({
    name: 'ibkr-mcp',
    version: '2.0.0',
  });

  registerAllTools(server, connection);

  // Connect to IB Gateway
  try {
    await connection.connect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Warning: Could not connect to IB Gateway: ${msg}\n`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = (): void => {
    connection.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
