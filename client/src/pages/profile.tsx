import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin, CreditCard, Calendar, Flag, Eye, EyeOff, ArrowLeft, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, logout, updateUser } = useUser();
  const { t } = useTranslation();
  const [showFullCPF, setShowFullCPF] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPixKey, setNewPixKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

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

  const handleUpdatePixKey = async () => {
    setIsUpdating(true);
    try {
      await updateUser({ paymentIdentifier: newPixKey });
      toast({
        title: "PIX Key Updated",
        description: "Your PIX key has been successfully updated.",
      });
      setSettingsOpen(false);
      setNewPixKey("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update PIX key.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header showAuthButton={false} username={user?.username} onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-muted/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {user.fullName 
                    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : user.username.slice(0, 2).toUpperCase()
                  }
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background border-2 border-background rounded-full flex items-center justify-center">
                  <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <DialogTrigger asChild>
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>User Settings</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="pix-key">
                            {user.nation === "BR" ? "PIX Key" : "Payment Identifier"}
                          </Label>
                          <Input
                            id="pix-key"
                            placeholder={
                              user.nation === "BR" 
                                ? "Enter your PIX key (email, phone, or CPF)"
                                : "Enter your payment identifier"
                            }
                            value={newPixKey}
                            onChange={(e) => setNewPixKey(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Current: {user.paymentIdentifier || "Not set"}
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSettingsOpen(false);
                              setNewPixKey("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdatePixKey}
                            disabled={isUpdating}
                          >
                            {isUpdating ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                {user.fullName || user.username}
              </h1>
              <p className="text-muted-foreground">
                Member since {formatDate(user.createdAt || new Date())}
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Personal Information Card */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Full Name */}
                  <div className="flex items-center justify-between py-4 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">Full Name</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{user.fullName || "Not provided"}</span>
                  </div>

                  {/* Username */}
                  <div className="flex items-center justify-between py-4 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium">Username</span>
                    </div>
                    <span className="text-muted-foreground font-medium">@{user.username}</span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between py-4 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">Email</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{user.email}</span>
                  </div>

                  {/* Phone Number */}
                  <div className="flex items-center justify-between py-4 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="font-medium">Phone Number</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{user.phoneNumber || "Not provided"}</span>
                  </div>

                  {/* Birth Date */}
                  <div className="flex items-center justify-between py-4 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                        <Calendar className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                      </div>
                      <span className="font-medium">Birth Date</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{formatDate(user.birthdate)}</span>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Location & Financial Info Card */}
            <div className="space-y-6">

              {/* Location Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-4xl mb-3">
                      {user.nation === 'BR' ? '🇧🇷' : user.nation === 'US' ? '🇺🇸' : '🌍'}
                    </div>
                    <p className="font-medium text-lg">
                      {user.nation ? getCountryName(user.nation) : "Not provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    Financial Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* PIX Key / Payment Identifier */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      {user.nation === "BR" ? "PIX Key" : "Payment Identifier"}
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg border text-sm font-mono break-all">
                      {user.paymentIdentifier || "Not provided"}
                    </div>
                  </div>

                  {/* CPF (for Brazilian users) */}
                  {user.nation === "BR" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        CPF
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-muted/50 rounded-lg border text-sm font-mono">
                          {formatCPF(user.cpf || "", showFullCPF)}
                        </div>
                        {user.cpf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFullCPF(!showFullCPF)}
                            className="px-3"
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

                </CardContent>
              </Card>
            </div>
          </div>

          {/* Account Actions */}
          <div className="mt-8 flex justify-center">
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                className="px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button 
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}