export interface AuthStatus {
  authenticated: boolean;
  competing: boolean;
  connected: boolean;
  message: string;
  fail?: string;
}

export interface AccountsResponse {
  accounts?: string[];
  acctProps?: Record<string, unknown>;
  aliases?: Record<string, string>;
  selectedAccount?: string;
}

export interface Position {
  acctId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  currency: string;
  avgCost: number;
  avgPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  exchs: string | null;
  expiry: string | null;
  putOrCall: string | null;
  multiplier: number | null;
  strike: number;
  exerciseStyle: string | null;
  assetClass: string;
  model: string;
  ticker: string;
  undConid: number;
  pageSize: number;
}

export interface PnlResponse {
  [accountId: string]: {
    dpl: number;
    upl: number;
    nl: number;
    el: number;
    mv: number;
  };
}

export interface MarketSnapshot {
  conid: number;
  conidEx: string;
  server_id: string;
  [fieldCode: string]: unknown;
}

export interface PriceBar {
  o: number; // open
  c: number; // close
  h: number; // high
  l: number; // low
  v: number; // volume
  t: number; // timestamp (ms)
}

export interface PriceHistoryResponse {
  symbol: string;
  text: string;
  priceFactor: number;
  startTime: string;
  high: string;
  low: string;
  timePeriod: string;
  barLength: number;
  mdAvailability: string;
  mktDataDelay: number;
  outsideRth: boolean;
  volumeFactor: number;
  priceDisplayRule: number;
  priceDisplayValue: string;
  negativeCapable: boolean;
  messageVersion: number;
  data: PriceBar[];
  points: number;
  travelTime: number;
}

export interface SecDefSearchResult {
  conid: number;
  companyHeader: string;
  companyName: string;
  symbol: string;
  description: string;
  restricted: string | null;
  fop: string | null;
  opt: string | null;
  war: string | null;
  sections: Array<{
    secType: string;
    months: string;
    exchange: string;
  }>;
}

export interface Trade {
  execution_id: string;
  symbol: string;
  side: string;
  order_description: string;
  trade_time: string;
  trade_time_r: number;
  size: number;
  price: string;
  submitter: string;
  exchange: string;
  commission: number;
  net_amount: number;
  account: string;
  accountCode: string;
  company_name: string;
  contract_description_1: string;
  sec_type: string;
  conidex: string;
  position: string;
  clearing_id: string;
  clearing_name: string;
}

export interface Order {
  acct: string;
  conidex: string;
  conid: number;
  orderId: number;
  cashCcy: string;
  sizeAndFills: string;
  orderDesc: string;
  description1: string;
  ticker: string;
  secType: string;
  listingExchange: string;
  remainingQuantity: number;
  filledQuantity: number;
  totalSize: number;
  companyName: string;
  status: string;
  order_ccp_status: string;
  avgPrice: string;
  origOrderType: string;
  supportsTaxOpt: string;
  lastExecutionTime: string;
  orderType: string;
  bgColor: string;
  fgColor: string;
  timeInForce: string;
  lastExecutionTime_r: number;
  side: string;
}
