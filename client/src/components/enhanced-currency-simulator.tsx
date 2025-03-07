import { CurrencySimulator } from "@/components/currency-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DollarSign, 
  Calendar, 
  ArrowRightLeft, 
  Info, 
  BarChart4, 
  ShieldCheck 
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Hedge } from "@db/schema";

interface EnhancedSimulatorProps {
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onOrdersUpdated?: () => void;
}

export function EnhancedCurrencySimulator({ onPlaceHedge, onOrdersUpdated }: EnhancedSimulatorProps) {
  const { t } = useTranslation();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Define the tooltip content for each section
  const tooltips = {
    currencyPair: {
      title: t('Currency Pair Selection'),
      description: t('Select which currencies you want to hedge. The base currency is the one you currently hold, while the target currency is the one you want to protect against.'),
      icon: <ArrowRightLeft className="h-8 w-8 text-primary" />
    },
    amount: {
      title: t('Amount to Hedge'),
      description: t('Enter the amount of currency you want to protect. This is the value that will be locked at the current exchange rate.'),
      icon: <DollarSign className="h-8 w-8 text-primary" />
    },
    duration: {
      title: t('Hedge Duration'),
      description: t('Select how long you want your hedge to last. Longer durations might have different costs but provide protection for a longer period.'),
      icon: <Calendar className="h-8 w-8 text-primary" />
    },
    direction: {
      title: t('Trade Direction'),
      description: t('Choose whether you want to buy or sell the target currency. This depends on your specific hedging needs and the direction of protection you require.'),
      icon: <ArrowRightLeft className="h-8 w-8 text-primary" />
    },
    simulation: {
      title: t('Simulation Results'),
      description: t('These results show you the cost of the hedge and the break-even point. The chart visualizes how your hedge would have performed against historical rates.'),
      icon: <BarChart4 className="h-8 w-8 text-primary" />
    },
    placeHedge: {
      title: t('Place Hedge Order'),
      description: t('Click to finalize your hedge order at the displayed rate and conditions. Once placed, your currency value will be protected for the specified duration.'),
      icon: <ShieldCheck className="h-8 w-8 text-primary" />
    }
  };

  // Show the tooltip information when hovering stops
  const handleTooltipShow = (tooltipId: string) => {
    setActiveTooltip(tooltipId);
  };

  // Hide the tooltip information when hovering starts again
  const handleTooltipHide = () => {
    setActiveTooltip(null);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {Object.entries(tooltips).map(([key, { title, description, icon }]) => (
          <Card 
            key={key}
            className={`bg-background transition-all ${activeTooltip === key ? 'bg-muted' : 'opacity-60'}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{title}</CardTitle>
                {icon}
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{activeTooltip === key ? description : t('Hover over this element in the simulator below for more information.')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TooltipProvider>
        <Card className="w-full shadow-md">
          <CardHeader className="bg-primary/10 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{t('Currency Hedge Simulator')}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>
                    {t('This simulator helps you understand how currency hedging works. Adjust the parameters to see different scenarios and costs. Hover over elements for detailed explanations.')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div 
              className="border border-primary/20 rounded-lg p-1 hover:border-primary transition-colors"
              onMouseOver={() => handleTooltipShow('currencyPair')}
              onMouseLeave={handleTooltipHide}
            >
              <CurrencySimulator 
                showGraph={true} 
                onPlaceHedge={onPlaceHedge} 
                onOrdersUpdated={onOrdersUpdated} 
              />
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}