'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, Trophy, DollarSign, Calendar, Clock } from 'lucide-react'
import { isToday, isPast, parseISO } from 'date-fns'
import Link from 'next/link'
import { format } from 'date-fns'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { FollowUpsWidget } from '@/components/dashboard/FollowUpsWidget'

export default function DashboardPage() {
    const supabase = createClient()

    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const [
                { count: total },
                { count: won },
                { data: stages },
                { data: valueSummary },
                { data: followUps },
                { data: recent },
            ] = await Promise.all([
                supabase.from('leads').select('*', { count: 'exact', head: true }),
                supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stages.name', 'Won'),
                supabase.from('stages').select('*, leads(id, value)').order('"order"', { ascending: true }),
                supabase.from('leads').select('value, stages(name)'),
                supabase.from('notes').select('follow_up_date, lead_id, leads(id, name, company)').not('follow_up_date', 'is', null),
                supabase.from('leads').select('*, stages(name, color)').order('created_at', { ascending: false }).limit(10),
            ])

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allLeads = (valueSummary ?? []) as any[]
            const getStageName = (l: any): string | undefined => {
                if (!l.stages) return undefined
                return Array.isArray(l.stages) ? l.stages[0]?.name : l.stages?.name
            }
            const wonLeads = allLeads.filter((l) => getStageName(l) === 'Won')
            const openLeads = allLeads.filter((l) =>
                getStageName(l) !== 'Won' && getStageName(l) !== 'Lost'
            )
            const pipelineValue = openLeads.reduce((sum: number, l: any) => sum + ((l.value as number | null) ?? 0), 0)

            // Pipeline chart data
            const pipelineData = (stages ?? []).map((s: any) => ({
                name: s.name,
                count: s.leads?.length ?? 0,
                value: (s.leads ?? []).reduce((sum: number, l: any) => sum + ((l.value as number | null) ?? 0), 0),
            }))

            // Source chart data
            const sourceMap: Record<string, number> = {}
            allLeads.forEach((l: any) => {
                const src = (l.source as string | null) ?? 'Unknown'
                sourceMap[src] = (sourceMap[src] ?? 0) + 1
            })
            const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }))

            // Follow-ups due (today or past)
            const overdueFollowUps = (followUps ?? [])
                .filter((n: { follow_up_date: string }) => {
                    try {
                        const d = parseISO(n.follow_up_date)
                        return isToday(d) || isPast(d)
                    } catch { return false }
                })
                .sort((a: { follow_up_date: string }, b: { follow_up_date: string }) =>
                    a.follow_up_date.localeCompare(b.follow_up_date)
                )

            return {
                total: total ?? 0,
                won: wonLeads.length,
                open: openLeads.length,
                pipelineValue,
                pipelineData,
                sourceData,
                overdueFollowUps,
                recentLeads: recent ?? [],
            }
        },
    })

    const PIE_COLORS = ['#6366f1', '#f59e0b', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#06b6d4']

    return (
        <div className="animate-entrance space-y-8 p-1">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
                <p className="text-slate-500 font-medium">Monitoring your sales velocity and relationship health</p>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Leads', value: stats?.total ?? 0, icon: Users, color: 'indigo', gradient: 'from-indigo-500/10 to-transparent' },
                    { label: 'Open Opportunities', value: stats?.open ?? 0, icon: TrendingUp, color: 'amber', gradient: 'from-amber-500/10 to-transparent' },
                    { label: 'Conversion Success', value: stats?.won ?? 0, icon: Trophy, color: 'emerald', gradient: 'from-emerald-500/10 to-transparent' },
                    { label: 'Pipeline Val.', value: stats?.pipelineValue ?? 0, icon: DollarSign, color: 'violet', gradient: 'from-violet-500/10 to-transparent', format: 'currency' },
                ].map(({ label, value, icon: Icon, color, gradient, format: fmt }) => (
                    <Card key={label} className="group relative overflow-hidden border-none glass-card hover:translate-y-[-4px] transition-all duration-300">
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradient)} />
                        <CardContent className="p-6 relative">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                                    <p className="text-2xl font-black text-slate-900 leading-none">
                                        {fmt === 'currency' ? formatCurrency(value as number) : value.toLocaleString()}
                                    </p>
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl shadow-sm transition-all duration-300 group-hover:scale-110",
                                    `bg-white/50 text-${color}-600 ring-1 ring-${color}-100`
                                )}>
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pipeline Bar Chart */}
                <Card className="lg:col-span-2 glass-card border-none overflow-hidden">
                    <CardHeader className="border-b border-slate-100/50 bg-white/30">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Pipeline Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats?.pipelineData ?? []} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        padding: '12px'
                                    }}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(v: any) => [v, 'leads']}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#6366f1"
                                    radius={[8, 8, 8, 8]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Leads by Source */}
                <Card className="glass-card border-none overflow-hidden">
                    <CardHeader className="border-b border-slate-100/50 bg-white/30">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Origin Channels</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={stats?.sourceData ?? []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    dataKey="value"
                                    paddingAngle={8}
                                    cornerRadius={12}
                                >
                                    {(stats?.sourceData ?? []).map((_: unknown, index: number) => (
                                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Follow-ups Due */}
                <Card className="glass-card border-none">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-800">Priority Follow-ups</CardTitle>
                        {(stats?.overdueFollowUps?.length ?? 0) > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-lg shadow-rose-200">
                                ACTION REQUIRED
                            </span>
                        )}
                    </CardHeader>
                    <CardContent>
                        {(stats?.overdueFollowUps?.length ?? 0) === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-sm font-medium">Your schedule is clear</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(stats?.overdueFollowUps ?? []).slice(0, 5).map((n: {
                                    lead_id: string; follow_up_date: string;
                                    leads: { id: string; name: string; company: string } | { id: string; name: string; company: string }[] | null
                                }) => {
                                    const leadsData = Array.isArray(n.leads) ? n.leads[0] : n.leads
                                    const isDueToday = isToday(parseISO(n.follow_up_date))
                                    return (
                                        <Link
                                            key={n.lead_id}
                                            href={`/leads/${n.lead_id}`}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-white/40 hover:bg-white hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm",
                                                    isDueToday ? "bg-amber-500" : "bg-rose-500"
                                                )}>
                                                    {leadsData?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{leadsData?.name}</p>
                                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">{leadsData?.company}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "text-xs font-black",
                                                    isDueToday ? "text-amber-600" : "text-rose-600"
                                                )}>
                                                    {isDueToday ? 'DUE TODAY' : 'OVERDUE'}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    {format(parseISO(n.follow_up_date), 'MMM d')}
                                                </p>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="glass-card border-none">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg">
                            <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <CardTitle className="text-base font-bold text-slate-800">Fresh Prospects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(stats?.recentLeads ?? []).slice(0, 5).map((lead: {
                                id: string; name: string; company: string; created_at: string;
                                stages: { name: string; color: string } | null
                            }) => (
                                <Link
                                    key={lead.id}
                                    href={`/leads/${lead.id}`}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-white/40 hover:bg-white hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                            {lead.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.name}</p>
                                            <p className="text-[11px] font-medium text-slate-400">{lead.company || 'Private Lead'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {lead.stages && (
                                            <span
                                                className="text-[10px] px-2.5 py-0.5 rounded-full text-white font-black uppercase tracking-tighter"
                                                style={{ backgroundColor: lead.stages.color }}
                                            >
                                                {lead.stages.name}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {format(parseISO(lead.created_at), 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Bottom widgets: follow-ups + calendar side by side on larger screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FollowUpsWidget />
                <CalendarWidget />
            </div>
        </div>
    )
}
