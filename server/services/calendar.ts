import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '@db';
import { users, calendarEvents } from '@db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { addMonths } from 'date-fns';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BASE_URL || 'http://localhost:5000'}/api/calendar/oauth/callback`
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function analyzeEvent(event: any): Promise<{
  needsHedging: boolean;
  reason?: string;
}> {
  const prompt = `
    Analyze this calendar event for potential currency hedging needs:
    Title: ${event.summary}
    Description: ${event.description || 'No description'}
    Location: ${event.location || 'No location'}
    Start: ${event.start?.dateTime || event.start?.date}
    End: ${event.end?.dateTime || event.end?.date}

    Determine if this event might involve international travel or payments in foreign currency.
    Consider factors like:
    - Event location in a different country
    - Keywords suggesting international travel or business
    - Mentions of costs in foreign currencies
    - International conferences or meetings

    Respond with JSON that includes:
    {
      "needsHedging": boolean,
      "reason": string explaining why or why not
    }
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that analyzes calendar events for potential currency hedging needs. Respond only with valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  try {
    return JSON.parse(completion.choices[0].message.content || '{"needsHedging": false}');
  } catch (e) {
    console.error('Failed to parse OpenAI response:', e);
    return { needsHedging: false };
  }
}

export async function syncUserCalendar(userId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.googleRefreshToken) {
    throw new Error('User not connected to Google Calendar');
  }

  // Set up authentication with the stored refresh token
  oauth2Client.setCredentials({
    refresh_token: user.googleRefreshToken
  });

  // Get events for the next 6 months
  const sixMonthsFromNow = addMonths(new Date(), 6);
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    timeMax: sixMonthsFromNow.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];

  // Process each event
  for (const event of events) {
    if (!event.id) continue;

    // Check if event already exists
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.googleEventId, event.id))
      .limit(1);

    if (existingEvent) continue;

    // Analyze event for hedging opportunities
    const analysis = await analyzeEvent(event);

    // Store event in database
    await db.insert(calendarEvents).values({
      userId,
      googleEventId: event.id,
      summary: event.summary || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      startDate: new Date(event.start?.dateTime || event.start?.date || ''),
      endDate: new Date(event.end?.dateTime || event.end?.date || ''),
      metadata: event,
      needsHedging: analysis.needsHedging,
      hedgingReason: analysis.reason || null,
      analyzedAt: new Date(),
    });
  }

  return events.length;
}

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent'
  });
}

export async function handleOAuthCallback(code: string, userId: number) {
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received');
  }

  // Store the refresh token
  await db
    .update(users)
    .set({
      googleCalendarEnabled: true,
      googleRefreshToken: tokens.refresh_token
    })
    .where(eq(users.id, userId));

  // Initial sync
  await syncUserCalendar(userId);
}
