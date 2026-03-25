export interface Config {
  gatewayUrl: string;
  accountId?: string;
  timeoutMs: number;
}

export function loadConfig(): Config {
  return {
    gatewayUrl: process.env.IBKR_GATEWAY_URL || 'https://localhost:5001',
    accountId: process.env.IBKR_ACCOUNT_ID || undefined,
    timeoutMs: parseInt(process.env.IBKR_TIMEOUT_MS || '15000', 10),
  };
}
