import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        let userId: string
        try { userId = await getServerUserId() } catch {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
        }
        const body = await request.json()
        const { rows, mapping, stage_id, customFieldMappings } = body

        if (!rows || !mapping) {
            return NextResponse.json({ error: 'Missing rows or mapping' }, { status: 400 })
        }

        const leads = rows.map((row: Record<string, string>) => {
            // Build custom_fields object from customFieldMappings
            const custom_fields: Record<string, string> = {}
            if (customFieldMappings && Array.isArray(customFieldMappings)) {
                for (const { fieldName, csvColumn } of customFieldMappings) {
                    if (csvColumn && row[csvColumn] !== undefined) {
                        custom_fields[fieldName] = row[csvColumn]
                    }
                }
            }
            return {
                name: row[mapping.name] || 'Unknown',
                email: row[mapping.email] || null,
                phone: row[mapping.phone] || null,
                company: row[mapping.company] || null,
                source: row[mapping.source] || null,
                stage_id: stage_id || null,
                value: row[mapping.value] ? parseFloat(row[mapping.value]) : null,
                tags: row[mapping.tags] || null,
                custom_fields,
                user_id: userId,
            }
        }).filter((l: { name: string }) => l.name)

        const { data, error } = await supabase.from('leads').insert(leads).select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ imported: data?.length ?? 0, errors: 0 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
