import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { leadSchema } from '@/lib/validations'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const { data: lead, error } = await supabase
            .from('leads')
            .select(`*, stages (id, name, color, "order"), notes (*)`)
            .eq('id', id)
            .single()

        if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        return NextResponse.json({ lead })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const body = await request.json()
        const parsed = leadSchema.partial().safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }
        // Merge custom_fields partially so no existing keys are wiped unless explicitly set
        const updatePayload: Record<string, unknown> = { ...parsed.data }
        const { data: lead, error } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', id)
            .select(`*, stages (id, name, color, "order")`)
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ lead })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const { error } = await supabase.from('leads').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
