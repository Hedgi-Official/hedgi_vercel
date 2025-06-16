import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

// Currency formatting utility
const getCurrencySymbol = (currencyPair: string) => {
  const pair = currencyPair.toUpperCase();
  
  if (pair.includes('BRL')) {
    return 'R$';
  } else if (pair.includes('MXN')) {
    return '$';
  } else if (pair.includes('USD')) {
    return '$';
  } else if (pair.includes('EUR')) {
    return '€';
  }
  
  return '$'; // Default fallback
};

const formatCurrency = (amount: number, currencyPair: string): string => {
  const symbol = getCurrencySymbol(currencyPair);
  return `${symbol}${amount.toFixed(2)}`;
};

interface TradeSpreadData {
  broker_fee: number;
  current_price: number;
  direction: string;
  entry_price: number;
  margin: number;
  pnl: number;
  return: number;
}

interface TradeCloseConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tradeId: number | null;
  currencyPair: string;
}

export function TradeCloseConfirmationDialog({
  open,
  onClose,
  onConfirm,
  tradeId,
  currencyPair
}: TradeCloseConfirmationDialogProps) {
  const { t } = useTranslation();
  const [spreadData, setSpreadData] = useState<TradeSpreadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && tradeId) {
      fetchSpreadData();
    }
  }, [open, tradeId]);

  const fetchSpreadData = async () => {
    if (!tradeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the Flask API endpoint for getting spread data
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      
      const response = await fetch(`${serverUrl}/api/flask/${tradeId}/trades/${tradeId}/spread`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch spread data: ${response.status}`);
      }
      
      const data = await response.json();
      setSpreadData(data);
    } catch (err) {
      console.error('Error fetching spread data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trade data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
    setSpreadData(null);
  };

  const handleCancel = () => {
    onClose();
    setSpreadData(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('simulator.confirmCloseTitle', 'Confirm Trade Closure')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">{t('Loading trade data...', 'Loading trade data...')}</span>
                </div>
              )}
              
              {error && (
                <div className="text-red-600 text-sm">
                  {t('Error loading trade data. Proceed with caution.', 'Error loading trade data. Proceed with caution.')}
                </div>
              )}
              
              {spreadData && !loading && (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('simulator.confirmCloseMessage', 'Are you sure you want to close this hedge?')}
                  </p>
                  
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t('Entry Price', 'Entry Price')}:</span>
                      <span className="font-medium">
                        {formatCurrency(spreadData.entry_price, currencyPair)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>{t('Current Price', 'Current Price')}:</span>
                      <span className="font-medium">
                        {formatCurrency(spreadData.current_price, currencyPair)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>{t('Margin', 'Margin')}:</span>
                      <span className="font-medium">
                        {formatCurrency(spreadData.margin, currencyPair)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">{t('You will receive', 'You will receive')}:</span>
                      <span className={`font-bold ${spreadData.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(spreadData.return, currencyPair)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {!spreadData && !loading && !error && (
                <p className="text-sm text-muted-foreground">
                  {t('simulator.confirmCloseMessage', 'Are you sure you want to close this hedge?')}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {t('simulator.confirmCloseNo', 'No, Keep Trade')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {t('simulator.confirmCloseYes', 'Yes, Close Trade')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}