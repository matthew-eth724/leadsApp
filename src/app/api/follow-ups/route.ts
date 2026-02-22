import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET /api/follow-ups
// Returns all notes that have a follow_up_date set, joined with their lead info.
// The UI groups results into: Overdue, Today, and Upcoming.
export async function GET() {
    try {
        const supabase = await createServerSupabaseClient()

        const { data: notes, error } = await supabase
            .from('notes')
            .select(`
                id,
                content,
                follow_up_date,
                google_calendar_event_id,
                leads (id, name, company, stage_id, stages (name, color))
            `)
            .not('follow_up_date', 'is', null)   // only notes that have a follow-up date
            .order('follow_up_date', { ascending: true }) // soonest first

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ notes })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
