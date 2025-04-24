import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { Hedge } from '@db/schema';

interface DirectTestPaymentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
}

/**
 * Direct Test Payment Component
 * 
 * This component provides a direct "Test: Continue without payment" button
 * that bypasses the payment window entirely for MXN currency payments
 */
export default function DirectTestPayment({ 
  hedgeData, 
  onSuccess
}: DirectTestPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Handle the test payment directly
  const handleTestPayment = async () => {
    setIsProcessing(true);
    
    try {
      console.log('Processing direct test payment...');
      
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isTest: true,
          hedgeData: hedgeData
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Test Payment Successful',
          description: 'Your hedge has been placed successfully.',
          variant: 'default',
        });
        onSuccess(hedgeData);
      } else {
        toast({
          title: 'Test Payment Failed',
          description: data.message || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing test payment:', error);
      toast({
        title: 'Test Payment Failed',
        description: 'Network error or server issue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="py-4 space-y-4">
      <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
        <p className="text-amber-800">
          <strong>Note:</strong> MXN payment processing is currently limited. 
          Please use the test payment option to proceed.
        </p>
      </div>
      
      <Button 
        onClick={handleTestPayment}
        className="w-full"
        variant="outline"
        size="lg"
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Test: Continue without payment'}
      </Button>
    </div>
  );
}