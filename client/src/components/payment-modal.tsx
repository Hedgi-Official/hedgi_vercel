import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import StaticBrick from './static-brick';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

/**
 * Payment Modal Using Static Brick Approach
 * 
 * This approach uses a special component that initializes the payment brick once and never again,
 * regardless of parent re-renders. It's completely immune to the React re-render cycle.
 */
export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  // Generate a unique ID only when the modal is opened or closed (not on every render)
  const [modalInstance] = useState(() => Math.random().toString(36).substring(2, 9));
  
  // Keep track of whether the component is mounted
  const componentMounted = useRef(false);
  
  // Make sure we only initialize once per modal opening
  useEffect(() => {
    if (isOpen) {
      componentMounted.current = true;
    } else {
      componentMounted.current = false;
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {hedgeData && isOpen ? (
          // The key is only based on the modalInstance - it doesn't change during the modal's lifetime
          <div key={`payment-${modalInstance}`} className="payment-wrapper">
            <StaticBrick
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