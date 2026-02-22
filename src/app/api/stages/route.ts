import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'
import { stageSchema } from '@/lib/validations'

export async function GET() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: stages, error } = await supabase
            .from('stages')
            .select('*')
            .order('"order"', { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ stages })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        let userId: string
        try { userId = await getServerUserId() } catch { return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }) }
        const body = await request.json()
        const parsed = stageSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }
        const { data: stage, error } = await supabase
            .from('stages')
            .insert({ ...parsed.data, user_id: userId })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ stage }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
