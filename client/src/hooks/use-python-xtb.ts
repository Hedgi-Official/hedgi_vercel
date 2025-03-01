
/**
 * usePythonXtb - React hook for interacting with the Python XTB API
 */
import { useState, useCallback, useEffect } from 'react';
import { pythonXtbService, PythonXTBService } from '../lib/python-xtb-service';

interface XTBCredentials {
  userId: string;
  password: string;
  appName?: string;
}

interface TradeData {
  symbol: string;
  cmd: number; // 0 for BUY, 1 for SELL
  volume: number;
  comment?: string;
  tp?: number; // Take profit
  sl?: number; // Stop loss
}

export function usePythonXtb() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await pythonXtbService.checkHealth();
        setIsConnected(response.success && response.data?.connected);
      } catch (err) {
        console.error('Failed to check XTB connection:', err);
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  // Connect to XTB API
  const connect = useCallback(async (credentials: XTBCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.connect(credentials);
      
      if (response.success) {
        setIsConnected(true);
        return response.data;
      } else {
        setError(response.error || 'Failed to connect to XTB');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error connecting to XTB: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect from XTB API
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.disconnect();
      
      if (response.success) {
        setIsConnected(false);
        return true;
      } else {
        setError(response.error || 'Failed to disconnect from XTB');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error disconnecting from XTB: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get symbol information
  const getSymbolInfo = useCallback(async (symbol: string) => {
    if (!isConnected) {
      setError('Not connected to XTB');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.getSymbolInfo(symbol);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || `Failed to get info for ${symbol}`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error getting symbol info: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Get currency pairs
  const getCurrencyPairs = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to XTB');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.getCurrencyPairs();
      
      if (response.success) {
        return response.data?.pairs || [];
      } else {
        setError(response.error || 'Failed to get currency pairs');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error getting currency pairs: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Place a trade
  const placeTrade = useCallback(async (tradeData: TradeData) => {
    if (!isConnected) {
      setError('Not connected to XTB');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.placeTrade(tradeData);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || 'Failed to place trade');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error placing trade: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Check trade status
  const checkTradeStatus = useCallback(async (orderId: number) => {
    if (!isConnected) {
      setError('Not connected to XTB');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.checkTradeStatus(orderId);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || `Failed to check status for order ${orderId}`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error checking trade status: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Get open trades
  const getOpenTrades = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to XTB');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.getOpenTrades();
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || 'Failed to get open trades');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error getting open trades: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Close a trade
  const closeTrade = useCallback(async (positionId: number) => {
    if (!isConnected) {
      setError('Not connected to XTB');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await pythonXtbService.closeTrade(positionId);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || `Failed to close trade ${positionId}`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error closing trade: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    getSymbolInfo,
    getCurrencyPairs,
    placeTrade,
    checkTradeStatus,
    getOpenTrades,
    closeTrade,
  };
}
