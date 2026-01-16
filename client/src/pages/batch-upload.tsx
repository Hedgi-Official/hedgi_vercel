import * as React from "react";
import * as XLSX from "xlsx";
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

const VALID_SYMBOLS = ["USDBRL", "EURUSD", "EURBRL", "USDMXN", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF"];
const VALID_DIRECTIONS = ["buy", "sell", "long", "short"];

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

function parseExcel(buffer: ArrayBuffer): ParsedOrder[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
  return parseRowsFromData(data);
}

function calculateNetPositions(orders: ParsedOrder[]): NetPosition[] {
  const validOrders = orders.filter(o => o.valid);
  
  const positionMap = new Map<string, { long: number; short: number; paymentDate: string; durationDays: number }>();
  
  validOrders.forEach(order => {
    const key = `${order.symbol}|${order.payment_date || "immediate"}`;
    const existing = positionMap.get(key) || { 
      long: 0, 
      short: 0, 
      paymentDate: order.payment_date || "Immediate",
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
      netVolume: Number(netVolume.toFixed(4)),
      netDirection,
      notional: netVolume * LOT_SIZE,
      durationDays: pos.durationDays,
    });
  });
  
  return positions.sort((a, b) => {
    const symbolCompare = a.symbol.localeCompare(b.symbol);
    if (symbolCompare !== 0) return symbolCompare;
    
    if (a.paymentDate === "Immediate") return -1;
    if (b.paymentDate === "Immediate") return 1;
    
    const dateA = parseDateDDMMYYYY(a.paymentDate);
    const dateB = parseDateDDMMYYYY(b.paymentDate);
    if (dateA && dateB) return dateA.getTime() - dateB.getTime();
    return a.paymentDate.localeCompare(b.paymentDate);
  });
}

export default function BatchUpload() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [parsedOrders, setParsedOrders] = React.useState<ParsedOrder[]>([]);
  const [netPositions, setNetPositions] = React.useState<NetPosition[]>([]);
  const [executionMode, setExecutionMode] = React.useState<"immediate" | "scheduled">("immediate");
  const [fileName, setFileName] = React.useState<string>("");

  React.useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.userType !== "business") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const orders = parseExcel(buffer);
        setParsedOrders(orders);
        setNetPositions(calculateNetPositions(orders));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const orders = parseCSV(content);
        setParsedOrders(orders);
        setNetPositions(calculateNetPositions(orders));
      };
      reader.readAsText(file);
    }
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
          return { order, success: res.ok, data };
        })
      );
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Batch execution complete",
        description: `${successCount} orders executed${failCount > 0 ? `, ${failCount} failed` : ""}`,
        variant: failCount > 0 ? "destructive" : "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
      setParsedOrders([]);
      setNetPositions([]);
      setFileName("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Execution failed", description: error.message });
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
        throw new Error(error.error || "Failed to schedule orders");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Orders scheduled",
        description: `${data.count} orders added to pending queue`,
      });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      setParsedOrders([]);
      setNetPositions([]);
      setFileName("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Scheduling failed", description: error.message });
    },
  });

  const handleExecute = () => {
    if (executionMode === "immediate") {
      executeNowMutation.mutate(netPositions);
    } else {
      scheduleOrdersMutation.mutate(parsedOrders);
    }
  };

  const validCount = parsedOrders.filter(o => o.valid).length;
  const invalidCount = parsedOrders.filter(o => !o.valid).length;

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
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Batch Hedge Upload</h1>
            <p className="text-muted-foreground">
              Upload CSV or Excel file with hedge orders for smart netting by payment date
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload File
              </CardTitle>
              <CardDescription>
                Required: symbol, direction, volume, payment_date (dd/mm/yyyy). Optional: duration_days, client_ref
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                  {fileName ? (
                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">Click to upload a different file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Drop CSV or Excel file here or click to upload</p>
                      <p className="text-sm text-muted-foreground">Supports .csv, .xlsx, .xls formats</p>
                    </div>
                  )}
                </label>
              </div>

              {parsedOrders.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{parsedOrders.length} rows</Badge>
                    <Badge variant="default" className="bg-emerald-500">{validCount} valid</Badge>
                    {invalidCount > 0 && (
                      <Badge variant="destructive">{invalidCount} errors</Badge>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Select value={executionMode} onValueChange={(v: "immediate" | "scheduled") => setExecutionMode(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            Execute Net Now
                          </div>
                        </SelectItem>
                        <SelectItem value="scheduled">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Schedule for Later
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleExecute}
                      disabled={validCount === 0 || executeNowMutation.isPending || scheduleOrdersMutation.isPending}
                      className="flex-1"
                    >
                      {executeNowMutation.isPending || scheduleOrdersMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : executionMode === "immediate" ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Execute {netPositions.filter(p => p.netDirection !== "flat").length} Net Orders
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Schedule {validCount} Orders
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setParsedOrders([]);
                        setNetPositions([]);
                        setFileName("");
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
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Net Position Summary by Payment Date
              </CardTitle>
              <CardDescription>
                Orders are netted per currency pair and payment date timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {netPositions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mb-4 opacity-20" />
                  <p>Upload a file to see net positions</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Long</TableHead>
                      <TableHead>Short</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {netPositions.map((pos, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{pos.symbol}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {pos.paymentDate}
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
                            <Badge variant="secondary">Flat</Badge>
                          ) : (
                            <Badge variant={pos.netDirection === "buy" ? "default" : "destructive"}>
                              {pos.netDirection.toUpperCase()} {pos.netVolume}
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
              <CardTitle>Parsed Orders</CardTitle>
              <CardDescription>Review all orders from the uploaded file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>Status</TableHead>
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
                                {order.errors.join(", ")}
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
    </div>
  );
}
