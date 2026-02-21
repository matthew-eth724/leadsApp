import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { stageSchema } from '@/lib/validations'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params
        const body = await request.json()
        const parsed = stageSchema.partial().safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }
        const { data: stage, error } = await supabase
            .from('stages')
            .update(parsed.data)
            .eq('id', id)
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ stage })
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
        // Check if any leads use this stage
        const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('stage_id', id)

        if (count && count > 0) {
            return NextResponse.json(
                { error: `Cannot delete stage: ${count} lead(s) are assigned to it.` },
                { status: 409 }
            )
        }

        const { error } = await supabase.from('stages').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
