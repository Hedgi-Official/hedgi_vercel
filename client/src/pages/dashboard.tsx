import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CurrencySimulator } from "@/components/currency-simulator";
import type { Hedge } from "@db/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const { data: hedges } = useQuery<Hedge[]>({
    queryKey: ["/api/hedges"],
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-secondary p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Hedgi</h1>
          <div className="flex items-center gap-4">
            <span className="text-white">Welcome, {user?.username}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Active Hedges</CardTitle>
            </CardHeader>
            <CardContent>
              {hedges?.length === 0 ? (
                <p>No active hedges</p>
              ) : (
                <div className="space-y-4">
                  {hedges?.map((hedge) => (
                    <div
                      key={hedge.id}
                      className="p-4 border rounded flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">
                          {hedge.baseCurrency} → {hedge.targetCurrency}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Amount: {hedge.amount} • Rate: {hedge.rate}
                        </p>
                      </div>
                      <Badge>{hedge.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New Hedge</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencySimulator />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}