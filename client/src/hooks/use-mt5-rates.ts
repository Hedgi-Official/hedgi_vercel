import { useState, useEffect, useCallback } from 'react';

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

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:6789');

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setRate(data);
        } catch (e) {
          setError('Failed to parse rate data');
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket error occurred');
        setStatus('disconnected');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        // Try to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      return () => {
        ws.close();
      };
    } catch (e) {
      setError('Failed to connect to MT5 service');
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    setStatus('connecting');
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
