import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/header";
import { Flag, User, Building2 } from "lucide-react";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const createRegisterSchema = (t: any, accountType: 'individual' | 'business') => {
  const baseSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().optional(),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters").regex(
        /(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
        "Password must include an uppercase letter, a number, and a special character"
      ),
    confirmPassword: z.string(),
    nation: z.string().min(1, "Please select your country"),
    paymentIdentifier: z.string().min(1, "Payment identifier is required"),
    cpf: z.string().min(1, "CPF is required").refine((val) => {
      const cleanCPF = val.replace(/\D/g, '');
      return cleanCPF.length === 11;
    }, "CPF must have 11 digits"),
    birthdate: z.string().min(1, "Birth date is required").refine((val) => {
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      const dayDiff = today.getDate() - date.getDate();

      const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
      return actualAge >= 18;
    }, t('auth.You must be at least 18 years old to use this service')),
    userType: z.enum(['individual', 'business']),
    companyName: accountType === 'business' 
      ? z.string().min(2, "Company name is required for business accounts")
      : z.string().optional(),
    companyRole: accountType === 'business'
      ? z.string().min(2, "Your role is required for business accounts")
      : z.string().optional(),
  });

  return baseSchema.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
};

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { login, register } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("login");
  
  // Account type state - 'individual' or 'business'
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');

  // Read type from URL query params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam === 'business') {
      setAccountType('business');
      setRegisterData(prev => ({ ...prev, userType: 'business' }));
    } else {
      setAccountType('individual');
      setRegisterData(prev => ({ ...prev, userType: 'individual' }));
    }
  }, []);

  // Sync registerData.userType when accountType toggle changes
  const handleAccountTypeChange = (newType: 'individual' | 'business') => {
    setAccountType(newType);
    setRegisterData(prev => ({
      ...prev,
      userType: newType,
      companyName: newType === 'individual' ? '' : prev.companyName,
      companyRole: newType === 'individual' ? '' : prev.companyRole,
    }));
  };

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Registration form state
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
    nation: "",
    paymentIdentifier: "",
    cpf: "",
    birthdate: "",
    inviteCode: "",
    userType: "individual",
    companyName: "",
    companyRole: "",
  });

  const handleSubmit = async (action: "login" | "register") => {
    try {
      if (action === "register") {
        // Validate with the selected account type
        const dataToValidate = { ...registerData, userType: accountType };
        const validationResult = createRegisterSchema(t, accountType).safeParse(dataToValidate);
        if (!validationResult.success) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: validationResult.error.errors[0].message,
          });
          return;
        }
      }

      let result;
      if (action === "login") {
        // Use direct fetch for login since the hook expects different format
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData),
        });
        const responseData = await response.json();
        result = { ok: response.ok, message: responseData.message };
      } else {
        // Include the selected account type in registration data
        const registrationPayload = {
          ...registerData,
          userType: accountType,
        };
        
        // Use the proper authentication endpoint with session management
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationPayload),
        });

        if (response.ok) {
          const responseData = await response.json();
          result = { ok: true, message: responseData.message || "Registration successful" };
        } else {
          const errorText = await response.text();
          result = { ok: false, message: errorText };
        }
      }

      if (result.ok) {
        toast({
          title: "Success",
          description: action === "login" ? "Logged in successfully!" : "Account created successfully!",
        });

        // Invalidate user query to refresh authentication state
        await queryClient.invalidateQueries({ queryKey: ['user'] });

        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    }
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  return (
    <div className="page-container bg-background">
      <Header showAuthButton={false} />
      <div className="container mx-auto px-4 page-section flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t('auth.Welcome back')}</CardTitle>
            
            {/* Account Type Toggle */}
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('individual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                    accountType === 'individual'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <User className="h-4 w-4" />
                  {t('Individual')}
                </button>
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('business')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                    accountType === 'business'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  {t('Business')}
                </button>
              </div>
              {/* Business message temporarily hidden - all accounts treated as individual */}
              {false && accountType === 'business' && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Business accounts include API access and team features
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.Sign In')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.Sign Up')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.Sign in to your account')}
                  </p>
                </div>
                <Input
                  placeholder={t('auth.Enter your username')}
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder={t('auth.Enter your password')}
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                />
                <Button
                  className="w-full"
                  onClick={() => handleSubmit("login")}
                >
                  {t('auth.Sign In')}
                </Button>
                <div className="text-center">
                  <Link href="/forgot-password">
                    <Button variant="link" className="text-sm text-muted-foreground">
                      Forgot your password?
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {t('auth.Don\'t have an account?')} {' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => setActiveTab("register")}
                  >
                    {t('auth.Sign Up')}
                  </Button>
                </p>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.Create your account')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('auth.Start protecting your currency today')}
                  </p>
                </div>

                {/* Invite Code Field */}
                <Input
                  placeholder="Enter invite code (beta access)"
                  value={registerData.inviteCode}
                  onChange={(e) => setRegisterData({ ...registerData, inviteCode: e.target.value })}
                  required
                />

                <>
                  {/* Alpha launch: Brazil only country selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      {t('auth.Select your country')}
                    </label>
                    <Select
                      value={registerData.nation}
                      onValueChange={(value) => {
                        setRegisterData({ 
                          ...registerData, 
                          nation: value,
                          paymentIdentifier: "" // Reset payment identifier when country changes
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('auth.Choose your country')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Original multi-country selection (commented for future expansion):
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      {t('auth.Select your country')}
                    </label>
                    <Select
                      value={registerData.nation}
                      onValueChange={(value) => {
                        setRegisterData({ 
                          ...registerData, 
                          nation: value,
                          paymentIdentifier: "" // Reset payment identifier when country changes
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('auth.Choose your country')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                        <SelectItem value="US">🇺🇸 United States</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  */}

                  <Input
                    placeholder={t('auth.Enter your full name')}
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  />
                  <Input
                    placeholder={t('auth.Enter your email')}
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  />
                </>

                {/* Business-specific fields - temporarily hidden, all accounts treated as individual */}
                {false && accountType === 'business' && (
                  <>
                    <Input
                      placeholder="Company Name"
                      value={registerData.companyName}
                      onChange={(e) => setRegisterData({ ...registerData, companyName: e.target.value })}
                    />
                    <Input
                      placeholder="Your Role (e.g., CEO, CFO, Treasury Manager)"
                      value={registerData.companyRole}
                      onChange={(e) => setRegisterData({ ...registerData, companyRole: e.target.value })}
                    />
                  </>
                )}

                <Input
                  placeholder={t('auth.Enter your username')}
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                />
                <Input
                  placeholder={t('auth.Phone Number (Optional)')}
                  type="tel"
                  value={registerData.phoneNumber}
                  onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                />

                {/* CPF Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('auth.CPF')}</label>
                  <Input
                    placeholder="000.000.000-00"
                    value={registerData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setRegisterData({ ...registerData, cpf: formatted });
                    }}
                    maxLength={14}
                  />
                </div>

                {/* Birthdate Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('auth.Date of Birth')}</label>
                  <Input
                    type="date"
                    value={registerData.birthdate}
                    onChange={(e) => setRegisterData({ ...registerData, birthdate: e.target.value })}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('auth.You must be at least 18 years old to use this service')}
                  </p>
                </div>

                {/* Payment Identifier Field - Changes based on country */}
                {registerData.nation && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {registerData.nation === "BR" ? "PIX Key/Account" : "Zelle Username"}
                    </label>
                    <Input
                      placeholder={
                        registerData.nation === "BR" 
                          ? "Enter your PIX key (email, phone, or CPF)"
                          : "Enter your Zelle username or email"
                      }
                      value={registerData.paymentIdentifier}
                      onChange={(e) => setRegisterData({ ...registerData, paymentIdentifier: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {registerData.nation === "BR" 
                        ? "This will be used for payments and transfers in Brazil"
                        : "This will be used for payments and transfers in the US"
                      }
                    </p>
                  </div>
                )}

                <Input
                  type="password"
                  placeholder={t('auth.Enter your password')}
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder={t('auth.Confirm Password')}
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                />
                <Button
                  className="w-full"
                  onClick={() => handleSubmit("register")}
                  disabled={!registerData.nation}
                >
                  {t('auth.Sign Up')}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  {t('auth.Already have an account?')} {' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => setActiveTab("login")}
                  >
                    {t('auth.Sign In')}
                  </Button>
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}