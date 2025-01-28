import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CurrencySimulator } from "@/components/currency-simulator";
import { Header } from "@/components/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hedge } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hedges } = useQuery<Hedge[]>({
    queryKey: ["/api/hedges"],
  });

  const createHedgeMutation = useMutation({
    mutationFn: async (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => {
      const response = await fetch('/api/hedges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hedgeData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      toast({
        title: "Hedge Created",
        description: "Your hedge position has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header username={user?.username} onLogout={handleLogout} />

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
                          Amount: {hedge.amount.toLocaleString('en-US', {
                            style: 'currency',
                            currency: hedge.baseCurrency
                          })}
                          • Rate: {Number(hedge.rate).toFixed(4)}
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
              <CurrencySimulator 
                showGraph={true} 
                onPlaceHedge={(hedgeData) => createHedgeMutation.mutate(hedgeData)}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}