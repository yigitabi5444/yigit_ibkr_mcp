export interface Config {
  gatewayUrl: string;
  accountId?: string;
  timeoutMs: number;
  brokerageTimeoutMs: number;
  tickleIntervalMs: number;
}

export function loadConfig(): Config {
  return {
    gatewayUrl: process.env.IBKR_GATEWAY_URL || 'https://localhost:5000',
    accountId: process.env.IBKR_ACCOUNT_ID || undefined,
    timeoutMs: parseInt(process.env.IBKR_TIMEOUT_MS || '15000', 10),
    brokerageTimeoutMs: parseInt(process.env.IBKR_BROKERAGE_TIMEOUT_MS || '120000', 10),
    tickleIntervalMs: parseInt(process.env.IBKR_TICKLE_INTERVAL_MS || '55000', 10),
  };
}
