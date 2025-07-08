
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, CreditCard, Calendar, Flag, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [showFullCPF, setShowFullCPF] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Redirect if not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Not provided";
    return new Date(date).toLocaleDateString();
  };

  const getCountryName = (countryCode: string) => {
    const countries: { [key: string]: string } = {
      'BR': 'Brazil 🇧🇷',
      'US': 'United States 🇺🇸'
    };
    return countries[countryCode] || countryCode;
  };

  const formatCPF = (cpf: string, showFull: boolean) => {
    if (!cpf) return "Not provided";
    
    if (showFull) {
      return cpf;
    }
    
    // Remove any existing formatting
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length === 11) {
      // Format as XXX.XXX.XXX-89 (mask first 9 digits, show last 2)
      const lastTwo = cleanCPF.slice(-2);
      return `XXX.XXX.XXX-${lastTwo}`;
    }
    
    return cpf; // Return as-is if not 11 digits
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={false} username={user?.username} onLogout={handleLogout} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Profile</h1>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Full Name */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Full Name</span>
                </div>
                <span className="text-muted-foreground">{user.fullName || "Not provided"}</span>
              </div>

              {/* Username */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Username</span>
                </div>
                <span className="text-muted-foreground">{user.username}</span>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email</span>
                </div>
                <span className="text-muted-foreground">{user.email}</span>
              </div>

              {/* Phone Number */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone Number</span>
                </div>
                <span className="text-muted-foreground">{user.phoneNumber || "Not provided"}</span>
              </div>

              {/* Country */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Country</span>
                </div>
                <span className="text-muted-foreground">
                  {user.nation ? getCountryName(user.nation) : "Not provided"}
                </span>
              </div>

              {/* PIX Key / Payment Identifier */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {user.nation === "BR" ? "PIX Key" : "Payment Identifier"}
                  </span>
                </div>
                <span className="text-muted-foreground">{user.paymentIdentifier || "Not provided"}</span>
              </div>

              {/* CPF (for Brazilian users) */}
              {user.nation === "BR" && (
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">CPF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatCPF(user.cpf || "", showFullCPF)}</span>
                    {user.cpf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullCPF(!showFullCPF)}
                        className="h-6 w-6 p-0"
                      >
                        {showFullCPF ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Birth Date */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Birth Date</span>
                </div>
                <span className="text-muted-foreground">{formatDate(user.birthdate)}</span>
              </div>

            </CardContent>
          </Card>

          <div className="mt-8 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
