import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import DirectLinkPayment from './direct-link-payment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

/**
 * Payment Modal Using Direct Link Approach
 * 
 * This approach completely bypasses the Mercado Pago brick component and
 * instead opens the checkout page in a separate window. This eliminates any
 * issues with the brick component being reinitialized due to React re-renders.
 */
export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  // Generate a unique ID each time the modal is opened (for cache-busting)
  const [modalKey] = useState(() => `payment-${Date.now()}`);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {hedgeData && isOpen ? (
          // Using modalKey ensures we create a fresh component for each payment attempt
          <div key={modalKey}>
            <DirectLinkPayment
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