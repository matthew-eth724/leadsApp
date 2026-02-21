import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Parser } from 'json2csv'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { searchParams } = new URL(request.url)
        const stage = searchParams.get('stage')

        let query = supabase
            .from('leads')
            .select(`*, stages (name), notes (id)`)
            .order('created_at', { ascending: false })

        if (stage) {
            query = query.eq('stage_id', stage)
        }

        const { data: leads, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rows = (leads ?? []).map((lead: {
            name: string; email: string; phone: string; company: string;
            source: string; stages: { name: string } | null; value: number;
            tags: string; notes: unknown[]; created_at: string; updated_at: string
        }) => ({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            source: lead.source,
            stage: lead.stages?.name ?? '',
            value: lead.value,
            tags: lead.tags,
            notes_count: lead.notes?.length ?? 0,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
        }))

        const parser = new Parser()
        const csv = rows.length > 0 ? parser.parse(rows) : 'name,email,phone,company,source,stage,value,tags,notes_count,created_at,updated_at'

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
