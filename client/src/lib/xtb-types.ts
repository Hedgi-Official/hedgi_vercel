// Types for XTB API responses and data
export interface XTBCredentials {
  userId: string;
  password: string;
}

export interface XTBResponse {
  status: boolean;
  returnData?: any;
  streamSessionId?: string;
  errorCode?: string;
  errorDescr?: string;
}

export interface SymbolRecord {
  symbol: string;
  currency: string;
  categoryName: string;
  description: string;
  bid: number;
  ask: number;
  high: number;
  low: number;
  time: number;
  timeString: string;
  spreadRaw: number;
  spreadTable: number;
  currencyPair: boolean;
  currencyProfit: string;
}

export interface StreamingSymbolResponse {
  command: "getSymbol";
  data: SymbolRecord;
}

export interface StreamingCandleRecord {
  close: number;
  ctm: number;
  ctmString: string;
  high: number;
  low: number;
  open: number;
  quoteId: number;
  symbol: string;
  vol: number;
}

export interface CandleStreamResponse {
  command: "candle";
  data: StreamingCandleRecord;
}