import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Check, CreditCard } from 'lucide-react';

interface SimplePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

/**
 * Simple Payment Modal
 * This is a completely simplified version that doesn't try to use Mercado Pago bricks
 * It just shows a static form that doesn't refresh or rerender
 */
export function SimplePaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: SimplePaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Calculate payment amount - this won't change during the lifecycle of the component
  const hedgeAmount = hedgeData ? Math.abs(Number(hedgeData.amount)) : 0;
  const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
  const paymentAmount = Number((hedgeCost).toFixed(2));
  
  // Function to handle form submission
  const handlePayment = () => {
    if (!hedgeData) return;
    
    setIsSubmitting(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsSubmitting(false);
      setIsComplete(true);
      
      // Simulate successful payment
      setTimeout(() => {
        onSuccess(hedgeData);
        toast({
          title: 'Payment successful',
          description: 'Your hedge order has been placed.',
          variant: 'default',
        });
        onClose();
      }, 1500);
    }, 2000);
  };
  
  // Reset state when modal is closed
  const handleModalClose = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset state after closing animation completes
      setTimeout(() => {
        setIsSubmitting(false);
        setIsComplete(false);
      }, 300);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {isComplete ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-medium mb-2">Payment Successful</h3>
            <p className="text-center text-muted-foreground mb-4">
              Your hedge order is being processed.
            </p>
          </div>
        ) : (
          <div className="py-4">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex justify-between mb-4">
                  <span>Hedge Amount:</span>
                  <span className="font-medium">{hedgeAmount} {hedgeData?.baseCurrency}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span>Fee (0.25%):</span>
                  <span className="font-medium">{paymentAmount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-3">
                  <span>Total:</span>
                  <span>{paymentAmount.toFixed(2)} {currency}</span>
                </div>
              </CardContent>
            </Card>
            
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Processing payment...</p>
              </div>
            ) : (
              <div>
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input 
                      id="card-number" 
                      placeholder="4111 1111 1111 1111" 
                      className="mt-1"
                      defaultValue="4111 1111 1111 1111"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input 
                        id="expiry" 
                        placeholder="MM/YY" 
                        className="mt-1"
                        defaultValue="12/25"
                      />
                    </div>
                    <div className="w-1/3">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input 
                        id="cvc" 
                        placeholder="123" 
                        className="mt-1"
                        defaultValue="123"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Cardholder Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Your Name" 
                      className="mt-1"
                      defaultValue="Test User"
                    />
                  </div>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handlePayment}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay {paymentAmount.toFixed(2)} {currency}
                </Button>
                
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (hedgeData) {
                        onSuccess(hedgeData);
                        toast({
                          title: 'Test payment processed',
                          description: 'Your hedge order has been placed.',
                          variant: 'default',
                        });
                        onClose();
                      }
                    }}
                  >
                    Skip payment (test mode)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}