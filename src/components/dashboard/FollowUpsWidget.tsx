'use client'

import { useQuery } from '@tanstack/react-query'
import { format, isToday, isPast, parseISO, isFuture } from 'date-fns'
import { AlertCircle, Clock, CalendarCheck, ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpNote {
    id: string
    content: string
    follow_up_date: string
    google_calendar_event_id?: string | null
    leads: {
        id: string
        name: string
        company?: string | null
        stages?: { name: string; color: string } | null
    } | null
}

// ─── Group label config ───────────────────────────────────────────────────────

const groups = [
    {
        key: 'overdue',
        label: 'Overdue',
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-50',
        border: 'border-red-100',
        badge: 'bg-red-100 text-red-700',
    },
    {
        key: 'today',
        label: 'Today',
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
        badge: 'bg-amber-100 text-amber-700',
    },
    {
        key: 'upcoming',
        label: 'Upcoming',
        icon: CalendarCheck,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        badge: 'bg-blue-100 text-blue-700',
    },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classify(dateStr: string): 'overdue' | 'today' | 'upcoming' {
    const d = parseISO(dateStr)
    if (isToday(d)) return 'today'
    if (isPast(d)) return 'overdue'
    return 'upcoming'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FollowUpsWidget() {
    const { data, isLoading } = useQuery<{ notes: FollowUpNote[] }>({
        queryKey: ['follow-ups'],
        queryFn: async () => {
            const res = await fetch('/api/follow-ups')
            if (!res.ok) throw new Error('Failed to load follow-ups')
            return res.json()
        },
        refetchInterval: 60_000, // refresh every minute to catch newly overdue items
    })

    const notes = data?.notes ?? []

    // Bucket notes into the three groups
    const grouped = {
        overdue: notes.filter(n => classify(n.follow_up_date) === 'overdue'),
        today: notes.filter(n => classify(n.follow_up_date) === 'today'),
        upcoming: notes.filter(n => classify(n.follow_up_date) === 'upcoming'),
    }

    const total = notes.length

    return (
        <Card className="mt-6">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Pending Follow-ups
                    {total > 0 && (
                        <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {total}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent>
                {isLoading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                )}

                {!isLoading && total === 0 && (
                    <div className="text-center py-8 space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto" />
                        <p className="text-sm text-slate-400">No pending follow-ups. You&apos;re all caught up!</p>
                    </div>
                )}

                {!isLoading && total > 0 && (
                    <div className="space-y-5">
                        {groups.map(({ key, label, icon: Icon, color, bg, border, badge }) => {
                            const items = grouped[key]
                            if (items.length === 0) return null

                            return (
                                <div key={key}>
                                    {/* Group heading */}
                                    <div className={cn('flex items-center gap-1.5 mb-2')}>
                                        <Icon className={cn('w-3.5 h-3.5', color)} />
                                        <span className={cn('text-[11px] font-black uppercase tracking-widest', color)}>
                                            {label}
                                        </span>
                                        <span className={cn('ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full', badge)}>
                                            {items.length}
                                        </span>
                                    </div>

                                    {/* Follow-up cards */}
                                    <div className="space-y-2">
                                        {items.map(note => (
                                            <Link
                                                key={note.id}
                                                href={`/leads/${note.leads?.id}`}
                                                className={cn(
                                                    'flex items-center justify-between gap-3 p-3 rounded-xl border transition-all hover:shadow-sm group',
                                                    bg, border
                                                )}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    {/* Lead name + stage badge */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm text-slate-800 truncate">
                                                            {note.leads?.name ?? 'Unknown Lead'}
                                                        </span>
                                                        {note.leads?.stages && (
                                                            <span
                                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                                                style={{
                                                                    background: note.leads.stages.color + '22',
                                                                    color: note.leads.stages.color,
                                                                }}
                                                            >
                                                                {note.leads.stages.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Note preview */}
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                        {note.content}
                                                    </p>

                                                    {/* Follow-up date */}
                                                    <p className={cn('text-[11px] font-semibold mt-1', color)}>
                                                        {isToday(parseISO(note.follow_up_date))
                                                            ? 'Today'
                                                            : format(parseISO(note.follow_up_date), 'EEE, MMM d')}
                                                    </p>
                                                </div>

                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
