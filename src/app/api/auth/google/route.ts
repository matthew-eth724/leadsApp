import { NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/supabase-server'

export async function GET() {
    try {
        await getServerUserId()
    } catch {
        return NextResponse.redirect('/login')
    }

    const scopes = ['https://www.googleapis.com/auth/calendar.events']
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
    })

    return NextResponse.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    )
}
