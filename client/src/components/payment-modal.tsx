import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import StaticPaymentComponent from './static-payment-component';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

/**
 * New Payment Modal Component
 * This version uses a memoized StaticPaymentComponent that won't re-render when exchange rates update
 * This fixes the issue with the payment brick being destroyed and recreated every 5 seconds
 */
export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  // No state is needed here as all state is managed in the StaticPaymentComponent
  
  // Render only the wrapper dialog and the static component if hedge data is available
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {hedgeData ? (
          // Use a key based on hedge data to ensure component is remounted only when hedge changes
          <StaticPaymentComponent 
            key={`payment-${hedgeData.baseCurrency}-${hedgeData.targetCurrency}-${hedgeData.amount}`}
            hedgeData={hedgeData}
            currency={currency}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        ) : (
          <div className="py-6 text-center">
            No hedge data available. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}