import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

export function getToolHandler(server: McpServer, toolName: string): ToolHandler {
  const tools = (server as unknown as Record<string, Record<string, { handler: ToolHandler }>>)._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`Tool ${toolName} not found`);
  return tool.handler;
}
