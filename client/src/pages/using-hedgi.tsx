import { Header } from "@/components/header";
import { EnhancedCurrencySimulator } from "@/components/enhanced-currency-simulator";
import { HedgiAIChatbot } from "@/components/hedgi-ai-chatbot";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  LineChart, 
  ArrowRightLeft,
  HelpCircle,
  Info
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function UsingHedgi() {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header showAuthButton={!user} username={user?.username} />
        
        <main className="container mx-auto px-4 py-10">
          {/* Page intro section */}
          <section className="mb-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">{t('Using Hedgi')}</h1>
              <p className="text-xl text-muted-foreground">
                {t('Discover the tools and features that make currency hedging simple and effective.')}
              </p>
            </div>
          </section>
          
          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left sidebar - Quick info */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    {t('Getting Started')}
                  </CardTitle>
                  <CardDescription>
                    {t('Key concepts and features to know')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                      {t('Currency Hedging')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('Protect your future expenses from currency fluctuations by locking in today\'s exchange rates.')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <LineChart className="h-4 w-4 text-primary" />
                      {t('Simulation Tools')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('Test different hedging scenarios with our interactive simulator to find the right strategy.')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-primary" />
                      {t('Hedgi AI Assistant')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('Get personalized advice and answers to your hedging questions from our AI assistant.')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      {t('Tips for Success')}
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                      <li>{t('Hover over elements in the simulator for detailed explanations')}</li>
                      <li>{t('Use the Hedgi AI to ask about hedging strategies')}</li>
                      <li>{t('Adjust parameters to see how costs change')}</li>
                      <li>{t('Consider your timeframe and risk tolerance')}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main content area - Simulator and Chatbot */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="simulator" className="w-full">
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="simulator" className="flex-1">
                    <LineChart className="h-4 w-4 mr-2" />
                    {t('Hedge Simulator')}
                  </TabsTrigger>
                  <TabsTrigger value="assistant" className="flex-1">
                    <Bot className="h-4 w-4 mr-2" />
                    {t('Hedgi AI Assistant')}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="simulator" className="space-y-4">
                  <p className="text-muted-foreground mb-4">
                    {t('Our interactive hedge simulator lets you explore different hedging scenarios. Hover over each element to learn more about its function and impact on your hedge.')}
                  </p>
                  <EnhancedCurrencySimulator />
                </TabsContent>
                
                <TabsContent value="assistant">
                  <p className="text-muted-foreground mb-4">
                    {t('Have questions about currency hedging or how to use Hedgi? Our AI assistant is here to help with personalized guidance and explanations.')}
                  </p>
                  <HedgiAIChatbot />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
