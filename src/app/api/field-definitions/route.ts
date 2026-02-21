import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data, error } = await supabase
            .from('lead_field_definitions')
            .select('*')
            .order('"order"', { ascending: true })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ fields: data ?? [] })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const body = await request.json()
        const { label, field_type, required, order } = body
        if (!label || typeof label !== 'string' || !label.trim()) {
            return NextResponse.json({ error: 'Label is required' }, { status: 400 })
        }
        // derive a safe key from the label
        const name = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
        const { data, error } = await supabase
            .from('lead_field_definitions')
            .insert({ name, label: label.trim(), field_type: field_type ?? 'text', required: required ?? false, order: order ?? 0 })
            .select()
            .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ field: data }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
