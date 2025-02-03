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

      // Construct WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      let reconnectTimeout: NodeJS.Timeout;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
        toast({
          title: "Connected to FBS",
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

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection to FBS service failed');
        setStatus('disconnected');
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to FBS service. Retrying...",
        });
      };

      ws.onclose = () => {
        setStatus('disconnected');
        // Try to reconnect after 5 seconds
        reconnectTimeout = setTimeout(() => {
          toast({
            title: "Reconnecting",
            description: "Attempting to reconnect to FBS service...",
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
      console.error('WebSocket connection error:', e);
      setError('Failed to connect to FBS service');
      setStatus('disconnected');
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to establish connection with FBS service",
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