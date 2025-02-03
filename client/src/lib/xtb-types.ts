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
  categoryName: string;
  currency: string;
  ask: number;
  bid: number;
  high: number;
  low: number;
  spreadRaw: number;
  spreadTable: number;
  time: number;
  quoteId: 1 | 2 | 3 | 4; // 1=fixed, 2=float, 3=depth, 4=cross
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
