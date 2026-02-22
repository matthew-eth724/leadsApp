'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isAfter, addDays, parseISO } from 'date-fns'
import { Calendar, ExternalLink, RefreshCw, CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface CalendarEvent {
    id: string
    summary?: string
    start?: { date?: string; dateTime?: string }
    description?: string
    htmlLink?: string
}

function extractLeadId(description?: string): string | null {
    if (!description) return null
    const match = description.match(/LeadID:([^\n\s]+)/)
    return match ? match[1] : null
}

export function CalendarWidget() {
    const [syncing, setSyncing] = useState(false)
    const [events, setEvents] = useState<CalendarEvent[] | null>(null)
    const [notConnected, setNotConnected] = useState(false)

    const sevenDaysFromNow = addDays(new Date(), 7)

    const upcomingEvents = events?.filter((ev) => {
        const dateStr = ev.start?.date || ev.start?.dateTime
        if (!dateStr) return false
        const evDate = parseISO(dateStr)
        return isAfter(evDate, new Date()) && !isAfter(evDate, sevenDaysFromNow)
    }) ?? []

    const handleSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch('/api/calendar/events')
            if (res.status === 500) {
                const json = await res.json()
                if (json.error?.includes('No Google Calendar connection')) {
                    setNotConnected(true)
                    return
                }
                throw new Error(json.error || 'Sync failed')
            }
            const data = await res.json()
            setEvents(data.events ?? [])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to sync calendar')
        } finally {
            setSyncing(false)
        }
    }

    return (
        <Card className="mt-6">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Upcoming Calendar Events
                </CardTitle>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSync}
                    disabled={syncing}
                    className="h-7 text-xs gap-1.5"
                >
                    <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Calendar'}
                </Button>
            </CardHeader>
            <CardContent>
                {notConnected && (
                    <div className="text-center py-8 space-y-2">
                        <CalendarOff className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-sm text-slate-500">Google Calendar not connected.</p>
                        <p className="text-xs text-slate-400">
                            Go to <a href="/settings?tab=integrations" className="text-primary underline">Settings → Integrations</a> to connect.
                        </p>
                    </div>
                )}

                {!notConnected && events === null && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Click <strong>Sync Calendar</strong> to load upcoming events.
                    </div>
                )}

                {!notConnected && events !== null && upcomingEvents.length === 0 && (
                    <div className="text-center py-8 space-y-2">
                        <Calendar className="w-10 h-10 text-slate-200 mx-auto" />
                        <p className="text-sm text-slate-400">No events in the next 7 days.</p>
                    </div>
                )}

                {upcomingEvents.length > 0 && (
                    <div className="divide-y divide-slate-100">
                        {upcomingEvents.map((ev) => {
                            const dateStr = ev.start?.date || ev.start?.dateTime
                            const formattedDate = dateStr
                                ? format(parseISO(dateStr), 'EEE, MMM d')
                                : '—'
                            const leadId = extractLeadId(ev.description)

                            return (
                                <div key={ev.id} className="flex items-start justify-between py-3 gap-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-slate-800 truncate">{ev.summary || 'Untitled event'}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
                                        {leadId && (
                                            <a href={`/leads/${leadId}`} className="text-xs text-primary hover:underline mt-0.5 inline-block">
                                                View lead →
                                            </a>
                                        )}
                                    </div>
                                    {ev.htmlLink && (
                                        <a
                                            href={ev.htmlLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-slate-400 hover:text-primary transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
