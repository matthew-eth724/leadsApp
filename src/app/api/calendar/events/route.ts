import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'
import { createCalendarEvent, listUpcomingEvents } from '@/lib/google-calendar'

// GET /api/calendar/events
// Fetches all Google Calendar events for the next 30 days for the logged-in user.
// The user must have connected their Google account first (stored in google_tokens table).
export async function GET() {
    // Identify the current user from their Supabase session
    let userId: string
    try { userId = await getServerUserId() } catch {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    try {
        // Call our Google Calendar helper — it handles token refresh automatically
        const events = await listUpcomingEvents(userId, 30)
        return NextResponse.json({ events })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch events'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

// POST /api/calendar/events
// Creates a new event in the user's Google Calendar and (if a noteId is provided)
// saves the returned Google event ID back onto the note row in Supabase.
// This allows future updates or deletions to target the exact calendar event.
export async function POST(request: NextRequest) {
    let userId: string
    try { userId = await getServerUserId() } catch {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    try {
        const body = await request.json()

        // These are the required fields for a calendar event
        const { title, date, description, leadId, noteId } = body

        if (!title || !date) {
            return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
        }

        // Create the event on Google Calendar via the googleapis library.
        // The leadId is embedded in the event description so the Dashboard widget
        // can parse it and link the event back to a specific lead.
        const event = await createCalendarEvent(userId, { title, date, description, leadId, noteId })

        // If we know which note triggered this event, store the Google event ID
        // on the note. This lets us update or delete the event if the note changes.
        if (noteId && event.id) {
            const supabase = await createServerSupabaseClient()
            await supabase
                .from('notes')
                .update({ google_calendar_event_id: event.id })
                .eq('id', noteId)
        }

        return NextResponse.json({ event }, { status: 201 })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create event'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
