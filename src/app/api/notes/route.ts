import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'
import { noteSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        let userId: string
        try { userId = await getServerUserId() } catch { return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }) }
        const body = await request.json()
        const parsed = noteSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }
        const { data: note, error } = await supabase
            .from('notes')
            .insert({
                lead_id: parsed.data.lead_id,
                content: parsed.data.content,
                follow_up_date: parsed.data.follow_up_date || null,
                user_id: userId,
            })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ note }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
