import { NextRequest, NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/supabase-server'
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    let userId: string
    try { userId = await getServerUserId() } catch {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { eventId } = await params
    try {
        const body = await request.json()
        const event = await updateCalendarEvent(userId, eventId, body)
        return NextResponse.json({ event })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update event'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    let userId: string
    try { userId = await getServerUserId() } catch {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { eventId } = await params
    try {
        await deleteCalendarEvent(userId, eventId)
        return NextResponse.json({ success: true })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete event'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
