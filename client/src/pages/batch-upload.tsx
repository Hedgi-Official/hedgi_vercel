import * as React from "react";
import ExcelJS from "exceljs";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/header";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Play,
  Clock,
  Calculator,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { LOT_SIZE } from "@/lib/pnl";

interface ParsedOrder {
  row: number;
  symbol: string;
  direction: string;
  volume: number;
  payment_date?: string;
  duration_days: number;
  execute_at?: string;
  client_ref?: string;
  valid: boolean;
  errors: string[];
}

interface NetPosition {
  symbol: string;
  paymentDate: string;
  longVolume: number;
  shortVolume: number;
  netVolume: number;
  netDirection: "buy" | "sell" | "flat";
  notional: number;
  durationDays: number;
}

interface TimeSegment {
  symbol: string;
  startDate: string;
  endDate: string;
  netVolume: number;
  netDirection: "buy" | "sell" | "flat";
  notional: number;
  isAdjustment: boolean;
  adjustmentDelta?: number;
  ordersInSegment: number;
}

interface SegmentedNetting {
  segments: TimeSegment[];
  executionOrders: Array<{
    symbol: string;
    direction: "buy" | "sell";
    volume: number;
    executeAt: string;
    isInitial: boolean;
    paymentDate: string;
  }>;
}

const TRADABLE_SYMBOLS = ["USDBRL", "EURUSD", "USDMXN", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF"];

interface SyntheticPairConfig {
  baseLeg: string;
  quoteLeg: string;
}

const SYNTHETIC_PAIRS: Record<string, SyntheticPairConfig> = {
  "EURBRL": {
    baseLeg: "EURUSD",
    quoteLeg: "USDBRL",
  },
  "GBPBRL": {
    baseLeg: "GBPUSD",
    quoteLeg: "USDBRL",
  },
};

const VALID_SYMBOLS = [...TRADABLE_SYMBOLS, ...Object.keys(SYNTHETIC_PAIRS)];
const VALID_DIRECTIONS = ["buy", "sell", "long", "short"];

interface ExchangeRates {
  [symbol: string]: { bid: number; ask: number };
}

function parseDateDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  const match = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2100) {
      return new Date(year, month, day);
    }
  }
  
  return null;
}

function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function calculateDurationDays(paymentDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);
  
  const diffTime = payment.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function excelDateToJSDate(excelDate: number): Date {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date;
}

function parseRowsFromData(rows: string[][]): ParsedOrder[] {
  if (rows.length < 2) return [];
  
  const headers = rows[0].map(h => h?.toString().toLowerCase().trim().replace(/['"]/g, "") || "");
  
  const symbolIdx = headers.findIndex(h => h === "symbol" || h === "pair" || h === "currency_pair");
  const directionIdx = headers.findIndex(h => h === "direction" || h === "side" || h === "type");
  const volumeIdx = headers.findIndex(h => h === "volume" || h === "size" || h === "amount" || h === "lots");
  const paymentDateIdx = headers.findIndex(h => h === "payment_date" || h === "paymentdate" || h === "payment" || h === "date" || h === "expiry" || h === "expiry_date");
  const durationIdx = headers.findIndex(h => h === "duration" || h === "duration_days" || h === "days");
  const executeAtIdx = headers.findIndex(h => h === "execute_at" || h === "scheduled");
  const clientRefIdx = headers.findIndex(h => h === "client_ref" || h === "reference" || h === "ref" || h === "id");

  const orders: ParsedOrder[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].map(v => v?.toString().trim().replace(/['"]/g, "") || "");
    if (values.every(v => !v)) continue;
    
    const errors: string[] = [];
    
    const symbol = symbolIdx >= 0 ? values[symbolIdx]?.toUpperCase() : "";
    const directionRaw = directionIdx >= 0 ? values[directionIdx]?.toLowerCase() : "";
    const volumeRaw = volumeIdx >= 0 ? parseFloat(values[volumeIdx]) : 0;
    const paymentDateRaw = paymentDateIdx >= 0 ? values[paymentDateIdx] : "";
    const durationRaw = durationIdx >= 0 ? parseInt(values[durationIdx]) : 0;
    const executeAt = executeAtIdx >= 0 ? values[executeAtIdx] : undefined;
    const clientRef = clientRefIdx >= 0 ? values[clientRefIdx] : undefined;
    
    if (!symbol) errors.push("Missing symbol");
    else if (!VALID_SYMBOLS.includes(symbol)) errors.push(`Invalid symbol: ${symbol}`);
    
    let direction = directionRaw;
    if (direction === "long") direction = "buy";
    if (direction === "short") direction = "sell";
    if (!direction) errors.push("Missing direction");
    else if (!["buy", "sell"].includes(direction)) errors.push(`Invalid direction: ${directionRaw}`);
    
    if (!volumeRaw || volumeRaw <= 0 || isNaN(volumeRaw)) errors.push("Invalid volume");
    
    let paymentDate: Date | null = null;
    let paymentDateStr = "";
    let durationDays = durationRaw || 0;
    
    if (paymentDateRaw) {
      const numericDate = parseFloat(paymentDateRaw);
      if (!isNaN(numericDate) && numericDate > 40000 && numericDate < 60000) {
        paymentDate = excelDateToJSDate(numericDate);
      } else {
        paymentDate = parseDateDDMMYYYY(paymentDateRaw);
        
        if (!paymentDate) {
          const altMatch = paymentDateRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
          if (altMatch) {
            const p1 = parseInt(altMatch[1], 10);
            const p2 = parseInt(altMatch[2], 10);
            let year = parseInt(altMatch[3], 10);
            if (year < 100) year += 2000;
            
            if (p1 <= 12 && p2 <= 31) {
              paymentDate = new Date(year, p1 - 1, p2);
            } else if (p2 <= 12 && p1 <= 31) {
              paymentDate = new Date(year, p2 - 1, p1);
            }
          }
        }
      }
      
      if (paymentDate) {
        paymentDateStr = formatDateDDMMYYYY(paymentDate);
        durationDays = calculateDurationDays(paymentDate);
        
        if (durationDays < 0) {
          errors.push("Payment date is in the past");
        }
      } else {
        errors.push(`Invalid date format: ${paymentDateRaw} (use dd/mm/yyyy)`);
      }
    }
    
    orders.push({
      row: i + 1,
      symbol,
      direction,
      volume: volumeRaw || 0,
      payment_date: paymentDateStr,
      duration_days: durationDays,
      execute_at: executeAt,
      client_ref: clientRef,
      valid: errors.length === 0,
      errors,
    });
  }
  
  return orders;
}

function parseCSV(content: string): ParsedOrder[] {
  const lines = content.trim().split("\n");
  const rows = lines.map(line => line.split(",").map(v => v.trim().replace(/['"]/g, "")));
  return parseRowsFromData(rows);
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParsedOrder[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  
  const data: any[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (rowData.length < colNumber - 1) {
        rowData.push("");
      }
      let value = cell.value;
      if (value && typeof value === 'object' && 'result' in value) {
        value = value.result;
      }
      if (value && typeof value === 'object' && 'richText' in value) {
        value = (value as any).richText.map((t: any) => t.text).join('');
      }
      rowData.push(value?.toString() ?? "");
    });
    data.push(rowData);
  });
  
  return parseRowsFromData(data);
}

function expandSyntheticPairs(orders: ParsedOrder[], rates: ExchangeRates): ParsedOrder[] {
  const expandedOrders: ParsedOrder[] = [];
  
  orders.forEach(order => {
    const syntheticConfig = SYNTHETIC_PAIRS[order.symbol];
    
    if (syntheticConfig && order.valid) {
      const baseLegRate = rates[syntheticConfig.baseLeg];
      
      if (!baseLegRate) {
        expandedOrders.push({
          ...order,
          valid: false,
          errors: [...order.errors, `Missing rate for ${syntheticConfig.baseLeg}`],
        });
        return;
      }
      
      const baseRate = order.direction === "buy" ? baseLegRate.ask : baseLegRate.bid;
      
      const eurNotional = order.volume * LOT_SIZE;
      const usdNotional = eurNotional * baseRate;
      const usdLots = usdNotional / LOT_SIZE;
      
      expandedOrders.push({
        ...order,
        row: order.row,
        symbol: syntheticConfig.baseLeg,
        volume: order.volume,
        client_ref: order.client_ref ? `${order.client_ref}_${syntheticConfig.baseLeg}` : `synth_${order.row}_${syntheticConfig.baseLeg}`,
      });
      
      expandedOrders.push({
        ...order,
        row: order.row,
        symbol: syntheticConfig.quoteLeg,
        volume: Number(usdLots.toFixed(2)),
        client_ref: order.client_ref ? `${order.client_ref}_${syntheticConfig.quoteLeg}` : `synth_${order.row}_${syntheticConfig.quoteLeg}`,
      });
    } else {
      expandedOrders.push(order);
    }
  });
  
  return expandedOrders;
}

async function fetchRatesForSymbols(symbols: string[]): Promise<ExchangeRates> {
  const rates: ExchangeRates = {};
  
  const uniqueSymbols = Array.from(new Set(symbols));
  
  const results = await Promise.allSettled(
    uniqueSymbols.map(async (symbol) => {
      const res = await fetch(`/api/hedgi/quotes/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol,
          direction: "buy",
          volume: 0.1,
          duration_days: 1,
          best_only: true,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Rate fetch failed for ${symbol}: ${res.status} - ${errorText}`);
        throw new Error(`API returned ${res.status} for ${symbol}`);
      }
      
      const data = await res.json();
      console.log(`Rate response for ${symbol}:`, JSON.stringify(data));
      
      if (data.brokers && data.brokers.length > 0) {
        const best = data.brokers.find((b: any) => b.recommended) || data.brokers[0];
        if (best.bid && best.ask) {
          return { symbol, bid: best.bid, ask: best.ask };
        }
      }
      
      if (data.bid && data.ask) {
        return { symbol, bid: data.bid, ask: data.ask };
      }
      
      if (data.rate || data.price) {
        const rate = data.rate || data.price;
        return { symbol, bid: rate, ask: rate };
      }
      
      console.error(`Unexpected response structure for ${symbol}:`, data);
      throw new Error(`No rate data in response for ${symbol}`);
    })
  );
  
  const errors: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      const { symbol, bid, ask } = result.value;
      rates[symbol] = { bid, ask };
    } else if (result.status === "rejected") {
      errors.push(`${uniqueSymbols[index]}: ${result.reason.message}`);
    }
  });
  
  if (errors.length > 0) {
    console.warn("Rate fetch errors:", errors.join("; "));
  }
  
  return rates;
}

const IMMEDIATE_MARKER = "__IMMEDIATE__";

function calculateNetPositions(orders: ParsedOrder[]): NetPosition[] {
  const validOrders = orders.filter(o => o.valid);
  
  const positionMap = new Map<string, { long: number; short: number; paymentDate: string; durationDays: number }>();
  
  validOrders.forEach(order => {
    const key = `${order.symbol}|${order.payment_date || "immediate"}`;
    const existing = positionMap.get(key) || { 
      long: 0, 
      short: 0, 
      paymentDate: order.payment_date || IMMEDIATE_MARKER,
      durationDays: order.duration_days
    };
    
    if (order.direction === "buy") {
      existing.long += order.volume;
    } else {
      existing.short += order.volume;
    }
    
    if (order.duration_days > existing.durationDays) {
      existing.durationDays = order.duration_days;
    }
    
    positionMap.set(key, existing);
  });
  
  const positions: NetPosition[] = [];
  positionMap.forEach((pos, key) => {
    const [symbol] = key.split("|");
    const netVolume = Math.abs(pos.long - pos.short);
    let netDirection: "buy" | "sell" | "flat" = "flat";
    if (pos.long > pos.short) netDirection = "buy";
    else if (pos.short > pos.long) netDirection = "sell";
    
    positions.push({
      symbol,
      paymentDate: pos.paymentDate,
      longVolume: pos.long,
      shortVolume: pos.short,
      netVolume: Number(netVolume.toFixed(2)),
      netDirection,
      notional: netVolume * LOT_SIZE,
      durationDays: pos.durationDays,
    });
  });
  
  return positions.sort((a, b) => {
    const symbolCompare = a.symbol.localeCompare(b.symbol);
    if (symbolCompare !== 0) return symbolCompare;
    
    if (a.paymentDate === IMMEDIATE_MARKER) return -1;
    if (b.paymentDate === IMMEDIATE_MARKER) return 1;
    
    const dateA = parseDateDDMMYYYY(a.paymentDate);
    const dateB = parseDateDDMMYYYY(b.paymentDate);
    if (dateA && dateB) return dateA.getTime() - dateB.getTime();
    return a.paymentDate.localeCompare(b.paymentDate);
  });
}

function calculateTimeSegmentNetting(orders: ParsedOrder[]): SegmentedNetting {
  const validOrders = orders.filter(o => o.valid && o.payment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateDDMMYYYY(today);
  
  const ordersBySymbol = new Map<string, ParsedOrder[]>();
  validOrders.forEach(order => {
    const existing = ordersBySymbol.get(order.symbol) || [];
    existing.push(order);
    ordersBySymbol.set(order.symbol, existing);
  });
  
  const segments: TimeSegment[] = [];
  const executionOrders: SegmentedNetting["executionOrders"] = [];
  
  ordersBySymbol.forEach((symbolOrders, symbol) => {
    const expiryDates = new Set<string>();
    expiryDates.add(todayStr);
    
    symbolOrders.forEach(order => {
      if (order.payment_date) {
        expiryDates.add(order.payment_date);
      }
    });
    
    const sortedDates = Array.from(expiryDates).sort((a, b) => {
      const dateA = parseDateDDMMYYYY(a);
      const dateB = parseDateDDMMYYYY(b);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
    
    let previousSignedNet = 0;
    
    for (let i = 0; i < sortedDates.length; i++) {
      const startDate = sortedDates[i];
      const endDate = sortedDates[i + 1] || null;
      const startDateObj = parseDateDDMMYYYY(startDate);
      
      if (!startDateObj) continue;
      
      const activeOrders = symbolOrders.filter(order => {
        const orderExpiry = parseDateDDMMYYYY(order.payment_date || "");
        if (!orderExpiry) return false;
        return orderExpiry > startDateObj || (i === 0 && orderExpiry >= startDateObj);
      });
      
      let signedNet = 0;
      activeOrders.forEach(order => {
        if (order.direction === "buy") {
          signedNet += order.volume;
        } else {
          signedNet -= order.volume;
        }
      });
      signedNet = Number(signedNet.toFixed(2));
      
      const netVolume = Math.abs(signedNet);
      let netDirection: "buy" | "sell" | "flat" = "flat";
      if (signedNet > 0) netDirection = "buy";
      else if (signedNet < 0) netDirection = "sell";
      
      const isAdjustment = i > 0;
      const delta = signedNet - previousSignedNet;
      
      segments.push({
        symbol,
        startDate,
        endDate: endDate || startDate,
        netVolume: Number(netVolume.toFixed(2)),
        netDirection,
        notional: netVolume * LOT_SIZE,
        isAdjustment,
        adjustmentDelta: isAdjustment ? Number(Math.abs(delta).toFixed(2)) : undefined,
        ordersInSegment: activeOrders.length,
      });
      
      if (i === 0 && signedNet !== 0) {
        executionOrders.push({
          symbol,
          direction: signedNet > 0 ? "buy" : "sell",
          volume: Number(Math.abs(signedNet).toFixed(2)),
          executeAt: new Date().toISOString(),
          isInitial: true,
          paymentDate: endDate || startDate,
        });
      } else if (isAdjustment && delta !== 0) {
        executionOrders.push({
          symbol,
          direction: delta > 0 ? "buy" : "sell",
          volume: Number(Math.abs(delta).toFixed(2)),
          executeAt: startDateObj.toISOString(),
          isInitial: false,
          paymentDate: endDate || startDate,
        });
      }
      
      previousSignedNet = signedNet;
    }
  });
  
  return { segments, executionOrders };
}

export default function BatchUpload() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const [parsedOrders, setParsedOrders] = React.useState<ParsedOrder[]>([]);
  const [rawOrders, setRawOrders] = React.useState<ParsedOrder[]>([]);
  const [netPositions, setNetPositions] = React.useState<NetPosition[]>([]);
  const [segmentedNetting, setSegmentedNetting] = React.useState<SegmentedNetting | null>(null);
  const [nettingMode, setNettingMode] = React.useState<"simple" | "timeline">("timeline");
  const [fileName, setFileName] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [hasSyntheticPairs, setHasSyntheticPairs] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  
  const [marketClosedDialog, setMarketClosedDialog] = React.useState<{
    open: boolean;
    openMarketOrders: Array<{ symbol: string; direction: string; volume: number; paymentDate: string; durationDays: number; isInitial: boolean }>;
    closedMarketOrders: Array<{ symbol: string; direction: string; volume: number; paymentDate: string; durationDays: number; isInitial: boolean }>;
    futureAdjustments: Array<{ symbol: string; direction: string; volume: number; paymentDate: string; executeAt: string }>;
  }>({
    open: false,
    openMarketOrders: [],
    closedMarketOrders: [],
    futureAdjustments: [],
  });
  const [isCheckingMarkets, setIsCheckingMarkets] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.userType !== "business") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const processOrdersWithSyntheticExpansion = async (orders: ParsedOrder[]) => {
    const syntheticOrders = orders.filter(o => o.valid && SYNTHETIC_PAIRS[o.symbol]);
    setHasSyntheticPairs(syntheticOrders.length > 0);
    
    if (syntheticOrders.length === 0) {
      setParsedOrders(orders);
      setNetPositions(calculateNetPositions(orders));
      setSegmentedNetting(calculateTimeSegmentNetting(orders));
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const rateSymbols = Array.from(new Set(
        syntheticOrders.flatMap(o => {
          const config = SYNTHETIC_PAIRS[o.symbol];
          return config ? [config.baseLeg] : [];
        })
      )) as string[];
      
      const rates = await fetchRatesForSymbols(rateSymbols);
      
      const missingRates = rateSymbols.filter(s => !rates[s]);
      if (missingRates.length > 0) {
        toast({
          variant: "destructive",
          title: t('batchUpload.missingExchangeRates'),
          description: t('batchUpload.missingExchangeRatesDesc', { symbols: missingRates.join(", ") }),
        });
      }
      
      const expandedOrders = expandSyntheticPairs(orders, rates);
      
      setParsedOrders(expandedOrders);
      setNetPositions(calculateNetPositions(expandedOrders));
      setSegmentedNetting(calculateTimeSegmentNetting(expandedOrders));
      
      toast({
        title: t('batchUpload.syntheticPairsExpanded'),
        description: t('batchUpload.syntheticPairsExpandedDesc', { count: syntheticOrders.length, expanded: syntheticOrders.length * 2 }),
      });
    } catch (error) {
      console.error("Failed to process synthetic pairs:", error);
      setParsedOrders(orders);
      setNetPositions(calculateNetPositions(orders));
      setSegmentedNetting(calculateTimeSegmentNetting(orders));
      toast({
        variant: "destructive",
        title: t('batchUpload.rateFetchFailed'),
        description: t('batchUpload.rateFetchFailedDesc'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const orders = await parseExcel(buffer);
        setRawOrders(orders);
        processOrdersWithSyntheticExpansion(orders);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const orders = parseCSV(content);
        setRawOrders(orders);
        processOrdersWithSyntheticExpansion(orders);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleFileDrop = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      toast({
        variant: "destructive",
        title: t('batchUpload.invalidFileType'),
        description: t('batchUpload.invalidFileTypeDesc'),
      });
      return;
    }
    processFile(file);
  };

  const executeNowMutation = useMutation({
    mutationFn: async (positions: NetPosition[]) => {
      const ordersToExecute = positions
        .filter(p => p.netDirection !== "flat" && p.netVolume > 0)
        .map(p => ({
          symbol: p.symbol,
          direction: p.netDirection,
          volume: p.netVolume,
          duration_days: p.durationDays,
          payment_date: p.paymentDate,
        }));
      
      const results = await Promise.all(
        ordersToExecute.map(async (order) => {
          const res = await fetch("/api/hedgi/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(order),
          });
          const data = await res.json();
          const errorCode = !res.ok ? (data.code || data.error_code || `HTTP_${res.status}`) : null;
          const errorMessage = !res.ok ? (data.message || data.error || JSON.stringify(data)) : null;
          return { order, success: res.ok, data, errorCode, errorMessage };
        })
      );
      
      const failedOrders = results.filter(r => !r.success);
      if (failedOrders.length > 0) {
        try {
          const pendingRes = await fetch("/api/pending-orders/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              orders: failedOrders.map(r => ({
                symbol: r.order.symbol,
                direction: r.order.direction,
                volume: r.order.volume,
                duration_days: r.order.duration_days,
                payment_date: r.order.payment_date || "Immediate",
                execute_at: new Date().toISOString(),
                status: "failed",
                result_error: `[${r.errorCode}] ${r.errorMessage}`,
                metadata: { original_order: r.order, api_response: r.data },
              })),
            }),
          });
          if (!pendingRes.ok) {
            console.error("Failed to save failed orders to pending queue");
          }
        } catch (e) {
          console.error("Error saving failed orders to pending queue:", e);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount > 0) {
        toast({
          title: t('batchUpload.batchExecutionComplete'),
          description: t('batchUpload.ordersExecutedWithFailures', { success: successCount, failed: failCount }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('batchUpload.batchExecutionComplete'), 
          description: t('batchUpload.ordersExecutedSuccess', { count: successCount }),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      setParsedOrders([]);
      setRawOrders([]);
      setNetPositions([]);
      setSegmentedNetting(null);
      setFileName("");
      setHasSyntheticPairs(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('batchUpload.executionFailed'), description: error.message });
    },
  });

  const scheduleOrdersMutation = useMutation({
    mutationFn: async (orders: ParsedOrder[]) => {
      const validOrders = orders.filter(o => o.valid);
      const res = await fetch("/api/pending-orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orders: validOrders.map(o => ({
            symbol: o.symbol,
            direction: o.direction,
            volume: o.volume,
            duration_days: o.duration_days,
            payment_date: o.payment_date,
            execute_at: o.execute_at || new Date().toISOString(),
            client_ref: o.client_ref,
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || t('batchUpload.schedulingFailed'));
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('batchUpload.ordersScheduled'),
        description: t('batchUpload.ordersAddedToPending', { count: data.count }),
      });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      setParsedOrders([]);
      setRawOrders([]);
      setNetPositions([]);
      setSegmentedNetting(null);
      setFileName("");
      setHasSyntheticPairs(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('batchUpload.schedulingFailed'), description: error.message });
    },
  });

  const checkMarketStatus = async (symbol: string): Promise<boolean> => {
    try {
      const base = symbol.slice(0, 3);
      const target = symbol.slice(3, 6);
      const res = await fetch("/api/hedgi/quotes/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol,
          base_currency: base,
          target_currency: target,
          volume: 0.01,
          direction: "buy",
          duration_days: 1,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        const errorCode = data.code || data.error_code || "";
        const errorMessage = data.message || data.error || "";
        if (errorCode === "MARKET_CLOSED" || errorMessage.toLowerCase().includes("market") && errorMessage.toLowerCase().includes("closed")) {
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error(`Error checking market status for ${symbol}:`, e);
      return true;
    }
  };

  const handleExecute = async () => {
    setIsCheckingMarkets(true);
    
    try {
      let initialOrders: Array<{ symbol: string; direction: "buy" | "sell"; volume: number; paymentDate: string; isInitial: boolean }> = [];
      let futureAdjustments: Array<{ symbol: string; direction: "buy" | "sell"; volume: number; paymentDate: string; executeAt: string }> = [];
      
      if (nettingMode === "timeline" && segmentedNetting) {
        initialOrders = segmentedNetting.executionOrders
          .filter(o => o.isInitial && o.volume > 0)
          .map(o => ({ symbol: o.symbol, direction: o.direction, volume: o.volume, paymentDate: o.paymentDate, isInitial: true }));
        futureAdjustments = segmentedNetting.executionOrders
          .filter(o => !o.isInitial && o.volume > 0)
          .map(o => ({ symbol: o.symbol, direction: o.direction, volume: o.volume, paymentDate: o.paymentDate, executeAt: o.executeAt }));
      } else {
        initialOrders = netPositions
          .filter(p => p.netDirection !== "flat" && p.netVolume > 0)
          .map(p => ({ symbol: p.symbol, direction: p.netDirection as "buy" | "sell", volume: p.netVolume, paymentDate: p.paymentDate, isInitial: true }));
      }
      
      const positionMap = new Map<string, { symbol: string; signedNet: number; paymentDate: string; durationDays: number }>();
      initialOrders.forEach(o => {
        const key = o.symbol;
        const existing = positionMap.get(key);
        const signedVol = o.direction === "buy" ? o.volume : -o.volume;
        if (existing) {
          existing.signedNet += signedVol;
        } else {
          positionMap.set(key, { symbol: o.symbol, signedNet: signedVol, paymentDate: o.paymentDate, durationDays: 0 });
        }
      });
      
      const consolidatedOrders = Array.from(positionMap.values())
        .filter(p => Math.abs(p.signedNet) > 0.0001)
        .map(p => ({
          symbol: p.symbol,
          direction: p.signedNet > 0 ? "buy" as const : "sell" as const,
          volume: Math.abs(p.signedNet),
          paymentDate: p.paymentDate,
          durationDays: p.durationDays,
          isInitial: true,
        }));
      
      const symbolsToCheck = Array.from(new Set(consolidatedOrders.map(o => o.symbol)));
      const marketStatusPromises = symbolsToCheck.map(async (symbol) => ({
        symbol,
        isOpen: await checkMarketStatus(symbol),
      }));
      const marketStatuses = await Promise.all(marketStatusPromises);
      const marketStatusMap = new Map(marketStatuses.map(s => [s.symbol, s.isOpen]));
      
      const openMarketOrders = consolidatedOrders.filter(o => marketStatusMap.get(o.symbol) === true);
      const closedMarketOrders = consolidatedOrders.filter(o => marketStatusMap.get(o.symbol) === false);
      
      if (closedMarketOrders.length > 0) {
        setMarketClosedDialog({
          open: true,
          openMarketOrders,
          closedMarketOrders,
          futureAdjustments,
        });
      } else {
        await executeUnifiedFlow(openMarketOrders, [], futureAdjustments);
      }
    } finally {
      setIsCheckingMarkets(false);
    }
  };

  const executeUnifiedFlow = async (
    openMarketOrders: Array<{ symbol: string; direction: string; volume: number; paymentDate: string; durationDays: number; isInitial: boolean }>,
    closedMarketOrders: Array<{ symbol: string; direction: string; volume: number; paymentDate: string; durationDays: number; isInitial: boolean }>,
    futureAdjustments: Array<{ symbol: string; direction: string; volume: number; paymentDate: string; executeAt: string }>
  ) => {
    if (futureAdjustments.length > 0) {
      try {
        const scheduleRes = await fetch("/api/pending-orders/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orders: futureAdjustments.map(o => ({
              symbol: o.symbol,
              direction: o.direction,
              volume: o.volume,
              duration_days: 0,
              payment_date: o.paymentDate,
              execute_at: o.executeAt,
              status: "scheduled",
              metadata: { type: "timeline_adjustment", isAdjustment: true },
            })),
          }),
        });
        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          toast({
            title: t('batchUpload.futureAdjustmentsScheduled'),
            description: t('batchUpload.futureAdjustmentsScheduledDesc', { count: data.count }),
          });
        }
      } catch (e) {
        console.error("Failed to schedule future adjustments:", e);
      }
    }
    
    if (closedMarketOrders.length > 0) {
      try {
        const pendingRes = await fetch("/api/pending-orders/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orders: closedMarketOrders.map(o => ({
              symbol: o.symbol,
              direction: o.direction,
              volume: o.volume,
              duration_days: o.durationDays,
              payment_date: o.paymentDate,
              execute_at: new Date().toISOString(),
              status: "market_closed",
              metadata: { type: "market_closed_retry", isInitial: o.isInitial },
            })),
          }),
        });
        if (pendingRes.ok) {
          const data = await pendingRes.json();
          toast({
            title: t('batchUpload.closedMarketOrdersQueued'),
            description: t('batchUpload.closedMarketOrdersQueuedDesc', { count: data.count }),
          });
        }
      } catch (e) {
        console.error("Failed to queue closed market orders:", e);
      }
    }
    
    if (openMarketOrders.length > 0) {
      const netPositionsToExecute: NetPosition[] = openMarketOrders.map(o => ({
        symbol: o.symbol,
        netDirection: o.direction as "buy" | "sell",
        netVolume: o.volume,
        paymentDate: o.paymentDate,
        durationDays: o.durationDays,
        longVolume: o.direction === "buy" ? o.volume : 0,
        shortVolume: o.direction === "sell" ? o.volume : 0,
        notional: o.volume * LOT_SIZE,
      }));
      executeNowMutation.mutate(netPositionsToExecute);
    } else {
      setParsedOrders([]);
      setRawOrders([]);
      setNetPositions([]);
      setSegmentedNetting(null);
      setFileName("");
      setHasSyntheticPairs(false);
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    }
  };

  const handleMarketClosedProceed = () => {
    setMarketClosedDialog(prev => ({ ...prev, open: false }));
    executeUnifiedFlow(
      marketClosedDialog.openMarketOrders,
      marketClosedDialog.closedMarketOrders,
      marketClosedDialog.futureAdjustments
    );
  };

  const handleMarketClosedCancel = () => {
    setMarketClosedDialog({
      open: false,
      openMarketOrders: [],
      closedMarketOrders: [],
      futureAdjustments: [],
    });
  };

  const validCount = parsedOrders.filter(o => o.valid).length;
  const invalidCount = parsedOrders.filter(o => !o.valid).length;

  const translatePaymentDate = (paymentDate: string) => {
    if (paymentDate === IMMEDIATE_MARKER) {
      return t('batchUpload.immediate');
    }
    return paymentDate;
  };

  const translateError = (error: string) => {
    if (error === "Missing symbol") return t('batchUpload.errorMissingSymbol');
    if (error.startsWith("Invalid symbol:")) {
      const symbol = error.replace("Invalid symbol:", "").trim();
      return t('batchUpload.errorInvalidSymbol', { symbol });
    }
    if (error === "Missing direction") return t('batchUpload.errorMissingDirection');
    if (error.startsWith("Invalid direction:")) {
      const direction = error.replace("Invalid direction:", "").trim();
      return t('batchUpload.errorInvalidDirection', { direction });
    }
    if (error === "Invalid volume") return t('batchUpload.errorInvalidVolume');
    if (error === "Payment date is in the past") return t('batchUpload.errorPaymentDatePast');
    if (error.startsWith("Invalid date format:")) {
      const match = error.match(/Invalid date format: (.+?) \(use dd\/mm\/yyyy\)/);
      if (match) return t('batchUpload.errorInvalidDateFormat', { date: match[1] });
    }
    if (error.startsWith("Missing rate for ")) {
      const symbol = error.replace("Missing rate for ", "").trim();
      return t('batchUpload.errorMissingRateFor', { symbol });
    }
    return error;
  };

  const translateDirection = (direction: "buy" | "sell") => {
    return direction === "buy" ? t('batchUpload.buy') : t('batchUpload.sell');
  };

  if (!user || user.userType !== "business") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/corporate-dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('batchUpload.backToDashboard')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('batchUpload.title')}</h1>
            <p className="text-muted-foreground">
              {t('batchUpload.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {t('batchUpload.uploadFile')}
              </CardTitle>
              <CardDescription>
                {t('batchUpload.uploadDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    handleFileDrop(file);
                  }
                }}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-12 h-12 text-muted-foreground animate-spin" />
                      <div>
                        <p className="font-medium">{t('batchUpload.processingSynthetic')}</p>
                        <p className="text-sm text-muted-foreground">{t('batchUpload.fetchingRates')}</p>
                      </div>
                    </>
                  ) : isDragging ? (
                    <>
                      <Upload className="w-12 h-12 text-primary" />
                      <div>
                        <p className="font-medium text-primary">{t('batchUpload.dropFileHere')}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                      {fileName ? (
                        <div>
                          <p className="font-medium">{fileName}</p>
                          <p className="text-sm text-muted-foreground">{t('batchUpload.clickToUploadDifferent')}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{t('batchUpload.dropOrClick')}</p>
                          <p className="text-sm text-muted-foreground">{t('batchUpload.supportedFormats')}</p>
                        </div>
                      )}
                    </>
                  )}
                </label>
              </div>

              {parsedOrders.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{parsedOrders.length} {t('batchUpload.rows')}</Badge>
                    <Badge variant="default" className="bg-emerald-500">{validCount} {t('batchUpload.valid')}</Badge>
                    {invalidCount > 0 && (
                      <Badge variant="destructive">{invalidCount} {t('batchUpload.errors')}</Badge>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleExecute}
                      disabled={validCount === 0 || executeNowMutation.isPending || isCheckingMarkets}
                      className="flex-1"
                    >
                      {isCheckingMarkets ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('batchUpload.checkingMarkets')}
                        </>
                      ) : executeNowMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('batchUpload.processing')}
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          {t('batchUpload.placeHedges')}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setParsedOrders([]);
                        setRawOrders([]);
                        setNetPositions([]);
                        setSegmentedNetting(null);
                        setFileName("");
                        setHasSyntheticPairs(false);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    {nettingMode === "timeline" ? t('batchUpload.timelineNetting') : t('batchUpload.simpleNetting')}
                  </CardTitle>
                  <CardDescription>
                    {nettingMode === "timeline" 
                      ? t('batchUpload.timelineDescription')
                      : t('batchUpload.simpleDescription')}
                  </CardDescription>
                </div>
                <Select value={nettingMode} onValueChange={(v) => setNettingMode(v as "simple" | "timeline")}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeline">{t('batchUpload.timeline')}</SelectItem>
                    <SelectItem value="simple">{t('batchUpload.simple')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {nettingMode === "timeline" && segmentedNetting ? (
                <div className="space-y-6">
                  {segmentedNetting.segments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Calculator className="w-12 h-12 mb-4 opacity-20" />
                      <p>{t('batchUpload.uploadFileToSee')}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-medium mb-3">{t('batchUpload.timeSegments')}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('batchUpload.symbol')}</TableHead>
                              <TableHead>{t('batchUpload.period')}</TableHead>
                              <TableHead>{t('batchUpload.netPosition')}</TableHead>
                              <TableHead>{t('batchUpload.activeOrders')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {segmentedNetting.segments.map((seg, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{seg.symbol}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="w-3 h-3" />
                                    {seg.startDate} {seg.endDate !== seg.startDate && `→ ${seg.endDate}`}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {seg.netDirection === "flat" ? (
                                    <Badge variant="secondary">{t('batchUpload.flat')}</Badge>
                                  ) : (
                                    <Badge variant={seg.netDirection === "buy" ? "default" : "destructive"}>
                                      {translateDirection(seg.netDirection)} {seg.netVolume}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {seg.ordersInSegment} {t('batchUpload.orders')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {segmentedNetting.executionOrders.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-3">{t('batchUpload.executionSchedule')}</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('batchUpload.symbol')}</TableHead>
                                <TableHead>{t('batchUpload.action')}</TableHead>
                                <TableHead>{t('batchUpload.volume')}</TableHead>
                                <TableHead>{t('batchUpload.executeAt')}</TableHead>
                                <TableHead>{t('batchUpload.type')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {segmentedNetting.executionOrders.map((order, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{order.symbol}</TableCell>
                                  <TableCell>
                                    <Badge variant={order.direction === "buy" ? "default" : "destructive"}>
                                      {order.direction.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{order.volume}</TableCell>
                                  <TableCell>
                                    {order.isInitial ? t('batchUpload.now') : new Date(order.executeAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={order.isInitial ? "outline" : "secondary"}>
                                      {order.isInitial ? t('batchUpload.initial') : t('batchUpload.adjustment')}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : netPositions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mb-4 opacity-20" />
                  <p>{t('batchUpload.uploadFileToSee')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('batchUpload.symbol')}</TableHead>
                      <TableHead>{t('batchUpload.paymentDate')}</TableHead>
                      <TableHead>{t('batchUpload.long')}</TableHead>
                      <TableHead>{t('batchUpload.short')}</TableHead>
                      <TableHead>{t('batchUpload.net')}</TableHead>
                      <TableHead>{t('batchUpload.days')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {netPositions.map((pos, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{pos.symbol}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {translatePaymentDate(pos.paymentDate)}
                          </div>
                        </TableCell>
                        <TableCell className="text-emerald-600">
                          {pos.longVolume > 0 && (
                            <>
                              <TrendingUp className="w-3 h-3 inline mr-1" />
                              {pos.longVolume}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {pos.shortVolume > 0 && (
                            <>
                              <TrendingDown className="w-3 h-3 inline mr-1" />
                              {pos.shortVolume}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          {pos.netDirection === "flat" ? (
                            <Badge variant="secondary">{t('batchUpload.flat')}</Badge>
                          ) : (
                            <Badge variant={pos.netDirection === "buy" ? "default" : "destructive"}>
                              {translateDirection(pos.netDirection)} {pos.netVolume}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {pos.durationDays}d
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {parsedOrders.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('batchUpload.parsedOrders')}</CardTitle>
              <CardDescription>{t('batchUpload.parsedOrdersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('batchUpload.row')}</TableHead>
                      <TableHead>{t('batchUpload.symbol')}</TableHead>
                      <TableHead>{t('batchUpload.direction')}</TableHead>
                      <TableHead>{t('batchUpload.volume')}</TableHead>
                      <TableHead>{t('batchUpload.paymentDate')}</TableHead>
                      <TableHead>{t('batchUpload.duration')}</TableHead>
                      <TableHead>{t('batchUpload.ref')}</TableHead>
                      <TableHead>{t('batchUpload.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedOrders.map((order, idx) => (
                      <TableRow key={idx} className={!order.valid ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono">{order.row}</TableCell>
                        <TableCell>{order.symbol || "-"}</TableCell>
                        <TableCell>
                          {order.direction && (
                            <Badge variant={order.direction === "buy" ? "default" : "secondary"}>
                              {order.direction.toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{order.volume || "-"}</TableCell>
                        <TableCell>
                          {order.payment_date ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              {order.payment_date}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{order.duration_days}d</TableCell>
                        <TableCell className="text-xs font-mono">
                          {order.client_ref || "-"}
                        </TableCell>
                        <TableCell>
                          {order.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-xs text-destructive">
                                {order.errors.map(translateError).join(", ")}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={marketClosedDialog.open} onOpenChange={(open) => !open && handleMarketClosedCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('batchUpload.marketClosedTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('batchUpload.marketClosedDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {marketClosedDialog.closedMarketOrders.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                  {t('batchUpload.closedMarkets')}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {marketClosedDialog.closedMarketOrders.map((o, i) => (
                    <Badge key={i} variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
                      {o.symbol} - {translateDirection(o.direction as "buy" | "sell")} {o.volume}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {marketClosedDialog.openMarketOrders.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                  {t('batchUpload.openMarkets')}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {marketClosedDialog.openMarketOrders.map((o, i) => (
                    <Badge key={i} variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-300">
                      {o.symbol} - {translateDirection(o.direction as "buy" | "sell")} {o.volume}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {t('batchUpload.marketClosedOptions')}
            </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleMarketClosedCancel}>
              {t('batchUpload.cancelAndReturn')}
            </Button>
            <Button onClick={handleMarketClosedProceed}>
              {t('batchUpload.proceedWithPending')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
