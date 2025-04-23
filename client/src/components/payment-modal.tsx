import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import PopupPayment from './popup-payment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

/**
 * Payment Modal Using Popup Window Approach
 * 
 * This approach opens a separate browser window for the Mercado Pago payment flow.
 * By using a separate window, we completely isolate the payment process from any
 * React render cycles or state updates in the main application.
 */
export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  // Generate a unique ID each time the modal is opened
  const [modalKey] = useState(() => `payment-${Date.now()}`);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {hedgeData && isOpen ? (
          // Using the modalKey ensures we create a fresh component for each payment attempt
          <div key={modalKey}>
            <PopupPayment
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