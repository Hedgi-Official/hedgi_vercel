import { useState, useId } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import IsolatedPaymentBrick from './isolated-payment-brick';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

/**
 * Completely Isolated Payment Modal Component
 * This version uses an isolated component that only mounts once and doesn't re-render
 * The key trick is to use the uniqueId to force React to only mount the component once per dialog open
 */
export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  // Generate a unique ID each time the modal is opened
  // When the dialog closes and reopens, we'll get a new component instance
  const [uniqueId] = useState(() => Math.random().toString(36).substring(2, 11));
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {hedgeData && isOpen ? (
          // The uniqueId ensures we get a fresh component each time the dialog opens
          // but the component isn't recreated during the lifetime of the dialog
          <div key={uniqueId}>
            <IsolatedPaymentBrick
              hedgeData={hedgeData}
              currency={currency}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="py-6 text-center">
            No hedge data available. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}