import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'

export async function DELETE() {
    let userId: string
    try { userId = await getServerUserId() } catch {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    await supabase.from('google_tokens').delete().eq('user_id', userId)
    return NextResponse.json({ success: true })
}
