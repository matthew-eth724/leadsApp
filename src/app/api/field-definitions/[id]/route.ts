import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const body = await request.json()
        const { label, field_type, required, order } = body
        const updates: Record<string, unknown> = {}
        if (label !== undefined) updates.label = label
        if (field_type !== undefined) updates.field_type = field_type
        if (required !== undefined) updates.required = required
        if (order !== undefined) updates.order = order
        const { data, error } = await supabase
            .from('lead_field_definitions')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ field: data })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const { error } = await supabase.from('lead_field_definitions').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
