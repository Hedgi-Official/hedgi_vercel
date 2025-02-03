import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MT5Rate {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
}

export function useMT5Rates() {
  const [rate, setRate] = useState<MT5Rate | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    try {
      setStatus('connecting');
      const ws = new WebSocket('ws://localhost:6789');
      let reconnectTimeout: NodeJS.Timeout;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
        toast({
          title: "Connected to MT5",
          description: "Live rates will now be displayed",
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setRate(data);
        } catch (e) {
          console.error('Failed to parse rate data:', e);
          setError('Failed to parse rate data');
        }
      };

      ws.onerror = () => {
        setError('Connection to MT5 service failed');
        setStatus('disconnected');
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to MT5 service. Retrying...",
        });
      };

      ws.onclose = () => {
        setStatus('disconnected');
        // Try to reconnect after 5 seconds
        reconnectTimeout = setTimeout(() => {
          toast({
            title: "Reconnecting",
            description: "Attempting to reconnect to MT5 service...",
          });
          connect();
        }, 5000);
      };

      return () => {
        clearTimeout(reconnectTimeout);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (e) {
      setError('Failed to connect to MT5 service');
      setStatus('disconnected');
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to establish connection with MT5 service",
      });
    }
  }, [toast]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  return {
    rate,
    status,
    error
  };
}