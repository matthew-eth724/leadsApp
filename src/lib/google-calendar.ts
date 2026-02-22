import { google } from 'googleapis'
import { createServerSupabaseClient } from './supabase-server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEventInput {
    title: string
    description?: string
    date: string       // ISO date e.g. "2024-03-15" — all-day event format
    leadId?: string    // embedded in description so the Dashboard can link back
    noteId?: string    // used to save the event ID onto the note after creation
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Reads the stored OAuth tokens for a user from Supabase.
 * Throws if the user hasn't connected their Google account yet.
 */
async function getTokensForUser(userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()
    if (error || !data) throw new Error('No Google Calendar connection found')
    return data
}

/**
 * Builds a fully authenticated Google OAuth2 client for a given user.
 *
 * The key thing this does automatically: if the stored access_token has
 * expired (or is about to expire in the next 60 seconds), it uses the
 * refresh_token to get a new one from Google — then saves the new token
 * back to Supabase so future requests work without the user having to
 * reconnect.
 */
async function buildOAuth2Client(userId: string) {
    // Create an OAuth2 client using app credentials from env vars
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    )

    const tokenRow = await getTokensForUser(userId)

    // Check if the access token is expired (or will expire within the next 60 seconds)
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null
    const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60_000

    if (isExpired && tokenRow.refresh_token) {
        // Token is expired — use the refresh_token to get a new access_token from Google
        oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token })
        const { credentials } = await oauth2Client.refreshAccessToken()

        const newExpiresAt = credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null

        // Save the new access token back to Supabase so we don't have to refresh again next time
        const supabase = await createServerSupabaseClient()
        await supabase
            .from('google_tokens')
            .update({
                access_token: credentials.access_token!,
                expires_at: newExpiresAt,
            })
            .eq('user_id', userId)

        oauth2Client.setCredentials(credentials)
    } else {
        // Token is still valid — use it directly
        oauth2Client.setCredentials({ access_token: tokenRow.access_token })
    }

    return oauth2Client
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates an all-day Google Calendar event for the user.
 * Embeds leadId and noteId in the event description so we can
 * identify which lead each event belongs to later.
 */
export async function createCalendarEvent(userId: string, event: CalendarEventInput) {
    const auth = await buildOAuth2Client(userId)
    const calendar = google.calendar({ version: 'v3', auth })

    // Build the description — includes the human-readable note text
    // plus machine-readable tags the Dashboard widget parses
    const description = [
        event.description,
        event.leadId ? `LeadID:${event.leadId}` : '',
        event.noteId ? `NoteID:${event.noteId}` : '',
    ].filter(Boolean).join('\n')

    const result = await calendar.events.insert({
        calendarId: 'primary', // create in the user's main calendar
        requestBody: {
            summary: event.title,
            description,
            start: { date: event.date }, // all-day event (date only, no time)
            end: { date: event.date },
        },
    })
    return result.data
}

/**
 * Updates an existing Google Calendar event (e.g. when the follow-up date changes).
 * Only the fields you pass are updated (partial patch).
 */
export async function updateCalendarEvent(userId: string, eventId: string, event: Partial<CalendarEventInput>) {
    const auth = await buildOAuth2Client(userId)
    const calendar = google.calendar({ version: 'v3', auth })

    const patch: Record<string, unknown> = {}
    if (event.title) patch.summary = event.title
    if (event.description !== undefined) patch.description = event.description
    if (event.date) {
        patch.start = { date: event.date }
        patch.end = { date: event.date }
    }

    // .patch() only updates the fields you provide — unlike .update() which replaces the whole event
    const result = await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: patch,
    })
    return result.data
}

/**
 * Permanently deletes a Google Calendar event.
 * Called when a follow-up note is deleted.
 */
export async function deleteCalendarEvent(userId: string, eventId: string) {
    const auth = await buildOAuth2Client(userId)
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.events.delete({ calendarId: 'primary', eventId })
}

/**
 * Lists upcoming Google Calendar events for the next `days` days.
 * Results are ordered by start time and capped at 50 events.
 */
export async function listUpcomingEvents(userId: string, days = 30) {
    const auth = await buildOAuth2Client(userId)
    const calendar = google.calendar({ version: 'v3', auth })

    const timeMin = new Date().toISOString()             // start: right now
    const timeMaxDate = new Date()
    timeMaxDate.setDate(timeMaxDate.getDate() + days)
    const timeMax = timeMaxDate.toISOString()            // end: N days from now

    const result = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,      // expand recurring events into individual instances
        orderBy: 'startTime',
        maxResults: 50,
    })
    return result.data.items ?? []
}

/**
 * Quick check: does this user have a Google Calendar connection stored?
 * Used by the /api/calendar/status endpoint and the Settings UI.
 */
export async function isGoogleConnected(userId: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
        .from('google_tokens')
        .select('id')
        .eq('user_id', userId)
        .single()
    return !!data
}
