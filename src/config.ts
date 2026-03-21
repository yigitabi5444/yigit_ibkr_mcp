export interface Config {
  host: string;
  port: number;
  clientId: number;
  accountId?: string;
  marketDataType: number;
  timeoutMs: number;
}

export function loadConfig(): Config {
  return {
    host: process.env.IBKR_HOST || '127.0.0.1',
    port: parseInt(process.env.IBKR_PORT || '4001', 10),
    clientId: parseInt(process.env.IBKR_CLIENT_ID || '0', 10),
    accountId: process.env.IBKR_ACCOUNT_ID || undefined,
    marketDataType: parseInt(process.env.IBKR_MARKET_DATA_TYPE || '3', 10),
    timeoutMs: parseInt(process.env.IBKR_TIMEOUT_MS || '15000', 10),
  };
}
