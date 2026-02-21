import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { leadSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const stage = searchParams.get('stage') || ''
        const source = searchParams.get('source') || ''
        const sortBy = searchParams.get('sortBy') || 'created_at'
        const sortOrder = searchParams.get('sortOrder') || 'desc'
        const page = parseInt(searchParams.get('page') || '1', 10)
        const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

        let query = supabase
            .from('leads')
            .select(`*, stages (id, name, color, "order")`, { count: 'exact' })

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
        }
        if (stage) {
            query = query.eq('stage_id', stage)
        }
        if (source) {
            query = query.eq('source', source)
        }

        const safeSort = ['name', 'company', 'source', 'value', 'created_at', 'updated_at'].includes(sortBy)
            ? sortBy
            : 'created_at'
        query = query.order(safeSort, { ascending: sortOrder === 'asc' })
        query = query.range((page - 1) * pageSize, page * pageSize - 1)

        const { data: leads, error, count } = await query

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ leads, total: count ?? 0 })
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const body = await request.json()
        const parsed = leadSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }
        const data = parsed.data
        const { data: lead, error } = await supabase
            .from('leads')
            .insert({
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                company: data.company || null,
                source: data.source || null,
                stage_id: data.stage_id || null,
                value: data.value ?? null,
                tags: data.tags || null,
                custom_fields: data.custom_fields ?? {},
            })
            .select(`*, stages (id, name, color, "order")`)
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ lead }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
