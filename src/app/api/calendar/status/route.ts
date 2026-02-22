import { NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/supabase-server'
import { isGoogleConnected } from '@/lib/google-calendar'

export async function GET() {
    let userId: string
    try { userId = await getServerUserId() } catch {
        return NextResponse.json({ connected: false })
    }
    try {
        const connected = await isGoogleConnected(userId)
        return NextResponse.json({ connected })
    } catch {
        return NextResponse.json({ connected: false })
    }
}
