import { useState, useEffect, useCallback } from "react";
import {
  SyntheticTrade,
  SyntheticTradeLeg,
  isSyntheticPair,
  getSyntheticConfig,
  formatPairForBackend,
  calculateLegVolumes,
  generateSyntheticTradeId,
} from "@/lib/synthetic-pairs";

const STORAGE_KEY = "hedgi_synthetic_trades";

export function useSyntheticTrades() {
  const [syntheticTrades, setSyntheticTrades] = useState<SyntheticTrade[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSyntheticTrades(
          parsed.map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
          }))
        );
      } catch (e) {
        console.error("[useSyntheticTrades] Failed to parse stored trades:", e);
      }
    }
  }, []);

  const saveTrades = useCallback((trades: SyntheticTrade[]) => {
    setSyntheticTrades(trades);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, []);

  const createSyntheticTrade = useCallback(
    (pair: string, direction: "buy" | "sell", volume: number): string => {
      const syntheticTradeId = generateSyntheticTradeId();
      const newTrade: SyntheticTrade = {
        syntheticPair: pair,
        syntheticTradeId,
        legs: [],
        direction,
        volume,
        createdAt: new Date(),
        status: "open",
      };
      
      const updated = [...syntheticTrades, newTrade];
      saveTrades(updated);
      return syntheticTradeId;
    },
    [syntheticTrades, saveTrades]
  );

  const addLegToSyntheticTrade = useCallback(
    (
      syntheticTradeId: string,
      pair: string,
      tradeId: number,
      direction: "buy" | "sell",
      volume: number,
      symbol: string
    ) => {
      const updated = syntheticTrades.map((t) => {
        if (t.syntheticTradeId === syntheticTradeId) {
          const newLeg: SyntheticTradeLeg = {
            pair,
            tradeId,
            direction,
            volume,
            symbol,
          };
          return { ...t, legs: [...t.legs, newLeg] };
        }
        return t;
      });
      saveTrades(updated);
    },
    [syntheticTrades, saveTrades]
  );

  const removeSyntheticTrade = useCallback(
    (syntheticTradeId: string) => {
      const updated = syntheticTrades.filter(
        (t) => t.syntheticTradeId !== syntheticTradeId
      );
      saveTrades(updated);
    },
    [syntheticTrades, saveTrades]
  );

  const updateSyntheticTradeStatus = useCallback(
    (syntheticTradeId: string, status: "open" | "closed" | "partial") => {
      const updated = syntheticTrades.map((t) => {
        if (t.syntheticTradeId === syntheticTradeId) {
          return { ...t, status };
        }
        return t;
      });
      saveTrades(updated);
    },
    [syntheticTrades, saveTrades]
  );

  const getSyntheticTradeByLegId = useCallback(
    (tradeId: number): SyntheticTrade | null => {
      return (
        syntheticTrades.find((t) =>
          t.legs.some((leg) => leg.tradeId === tradeId)
        ) || null
      );
    },
    [syntheticTrades]
  );

  const getSyntheticTradeById = useCallback(
    (syntheticTradeId: string): SyntheticTrade | null => {
      return (
        syntheticTrades.find((t) => t.syntheticTradeId === syntheticTradeId) ||
        null
      );
    },
    [syntheticTrades]
  );

  return {
    syntheticTrades,
    createSyntheticTrade,
    addLegToSyntheticTrade,
    removeSyntheticTrade,
    updateSyntheticTradeStatus,
    getSyntheticTradeByLegId,
    getSyntheticTradeById,
  };
}
