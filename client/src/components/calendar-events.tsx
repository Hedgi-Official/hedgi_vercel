import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent } from "@db/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  onCreateHedge: (event: CalendarEvent) => void;
}

export function CalendarEvents({ onCreateHedge }: Props) {
  const { data: events } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const { data: authUrl } = useQuery<{ authUrl: string }>({
    queryKey: ["/api/calendar/auth"],
  });

  if (!events?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Connect your Google Calendar to see events that might need currency hedging
          </p>
          <Button
            asChild
            className="bg-white hover:bg-white/90 text-black"
          >
            <a href={authUrl?.authUrl}>
              <img
                src="https://developers.google.com/identity/images/btn_google_signin_dark_normal_web.png"
                alt="Sign in with Google"
                className="h-6"
              />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const relevantEvents = events.filter(event => event.needsHedging);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events Needing Hedging</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {relevantEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{event.summary}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.startDate), 'PPP')}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{event.hedgingReason}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {event.location && (
                <p className="text-sm text-muted-foreground mb-2">
                  📍 {event.location}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateHedge(event)}
                className="w-full mt-2"
              >
                Create Hedge
              </Button>
            </div>
          ))}

          {relevantEvents.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No events currently need hedging
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
