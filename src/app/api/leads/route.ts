import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUserId } from '@/lib/supabase-server'
import { leadSchema } from '@/lib/validations'

// GET /api/leads
// Fetches a paginated, filtered, and sorted list of leads for the logged-in user.
// RLS on the leads table ensures users can only see their own data automatically.
export async function GET(request: NextRequest) {
    try {
        // Create a Supabase client that reads the session from the request cookies
        const supabase = await createServerSupabaseClient()

        // Pull query parameters from the URL (e.g. /api/leads?search=john&stage=abc)
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const stage = searchParams.get('stage') || ''
        const source = searchParams.get('source') || ''
        const sortBy = searchParams.get('sortBy') || 'created_at'
        const sortOrder = searchParams.get('sortOrder') || 'desc'
        const page = parseInt(searchParams.get('page') || '1', 10)
        const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

        // Start building the query — we also join the stages table so we
        // can show stage name and color without a second request
        let query = supabase
            .from('leads')
            .select(`*, stages (id, name, color, "order")`, { count: 'exact' })

        // Optional: filter leads whose name, email, or company contain the search term
        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
        }

        // Optional: filter by a specific stage ID
        if (stage) {
            query = query.eq('stage_id', stage)
        }

        // Optional: filter by lead source (e.g. "referral", "website")
        if (source) {
            query = query.eq('source', source)
        }

        // Only allow sorting by safe column names to prevent SQL injection
        const safeSort = ['name', 'company', 'source', 'value', 'created_at', 'updated_at'].includes(sortBy)
            ? sortBy
            : 'created_at'
        query = query.order(safeSort, { ascending: sortOrder === 'asc' })

        // Apply pagination — page 1 = rows 0-49, page 2 = rows 50-99, etc.
        query = query.range((page - 1) * pageSize, page * pageSize - 1)

        const { data: leads, error, count } = await query

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Return the leads array and the total count (used for pagination UI)
        return NextResponse.json({ leads, total: count ?? 0 })
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/leads
// Creates a new lead and attaches it to the logged-in user via user_id.
// The user_id is required because Supabase RLS will reject inserts without it.
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()

        // Get the current user's ID from their session cookie.
        // If they're not logged in, return a 401 immediately.
        let userId: string
        try { userId = await getServerUserId() } catch {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
        }

        const body = await request.json()

        // Validate the request body against our Zod schema before touching the DB
        const parsed = leadSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const data = parsed.data

        // Insert the lead — we explicitly list every column to avoid
        // accidentally writing unexpected fields from the request body
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
                custom_fields: data.custom_fields ?? {}, // flexible JSONB for user-defined fields
                user_id: userId,                   // ties the lead to this user for RLS
            })
            .select(`*, stages (id, name, color, "order")`) // return the full lead + stage info
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ lead }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
