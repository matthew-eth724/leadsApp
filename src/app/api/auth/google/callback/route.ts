import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
        return NextResponse.redirect(new URL('/settings?google_error=access_denied', request.url))
    }

    let userId: string
    try {
        userId = await getServerUserId()
    } catch {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)

    const supabase = await createServerSupabaseClient()
    await supabase.from('google_tokens').upsert({
        user_id: userId,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
    }, { onConflict: 'user_id' })

    return NextResponse.redirect(new URL('/settings?tab=integrations&connected=true', request.url))
}
