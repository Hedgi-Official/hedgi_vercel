import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HedgeSimulator } from "@/components/hedge-simulator";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SelectHedge } from "@db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();

  const { data: hedges } = useQuery<SelectHedge[]>({
    queryKey: ["/api/hedges"],
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Hedgi</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Welcome, {user?.username}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>New Hedge</CardTitle>
            </CardHeader>
            <CardContent>
              <HedgeSimulator />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Hedges</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Base Currency</TableHead>
                    <TableHead>Target Currency</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hedges?.map((hedge) => (
                    <TableRow key={hedge.id}>
                      <TableCell>{hedge.baseCurrency}</TableCell>
                      <TableCell>{hedge.targetCurrency}</TableCell>
                      <TableCell>{hedge.amount.toString()}</TableCell>
                      <TableCell>
                        {new Date(hedge.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(hedge.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{hedge.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
