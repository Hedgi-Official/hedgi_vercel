import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function ConfirmReset() {
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    // Extract token from URL parameters
    const params = new URLSearchParams(location.split('?')[1]);
    const token = params.get('token');
    
    if (token) {
      // Redirect to the reset password page with the token
      navigate(`/reset-password?token=${token}`);
    } else {
      // No token, redirect to forgot password page
      navigate('/forgot-password');
    }
  }, [location, navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-lg font-semibold mb-2">Validating reset link...</h2>
        <p className="text-muted-foreground">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}