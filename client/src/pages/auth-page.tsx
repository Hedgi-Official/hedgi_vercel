import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/header";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");

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
  });

  const handleSubmit = async (action: "login" | "register") => {
    try {
      const data = action === "login" ? loginData : registerData;

      if (action === "register") {
        const validationResult = registerSchema.safeParse(data);
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
        result = await login(data);
      } else {
        // Use the working signup endpoint
        const response = await fetch('/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        const responseData = await response.json();
        result = { ok: response.ok, message: responseData.message };
      }

      if (result.ok) {
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
    <div className="min-h-screen bg-background">
      <Header showAuthButton={false} />
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t('auth.Welcome back')}</CardTitle>
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