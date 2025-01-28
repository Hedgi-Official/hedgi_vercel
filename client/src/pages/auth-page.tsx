import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  phoneNumber: z.string().optional(),
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register } = useUser();
  const { toast } = useToast();

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Registration form state
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    phoneNumber: "",
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

      const result = await (action === "login" ? login : register)(data);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-center">Welcome to Hedgi</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Input
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={() => handleSubmit("login")}
              >
                Login
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <Input
                placeholder="Full Name"
                value={registerData.fullName}
                onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              />
              <Input
                placeholder="Username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              />
              <Input
                placeholder="Phone Number (Optional)"
                type="tel"
                value={registerData.phoneNumber}
                onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={() => handleSubmit("register")}
              >
                Register
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}