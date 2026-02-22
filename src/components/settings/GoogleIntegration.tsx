'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, Unlink, ExternalLink } from 'lucide-react'

export function GoogleIntegration() {
    const [connected, setConnected] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()

    // Check connection status
    useEffect(() => {
        checkStatus()
        // Show success toast if we just connected
        if (searchParams.get('connected') === 'true') {
            toast.success('Google Calendar connected!')
            router.replace('/settings?tab=integrations')
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const checkStatus = async () => {
        const res = await fetch('/api/calendar/status')
        if (res.ok) {
            const { connected } = await res.json()
            setConnected(connected)
        }
    }

    const handleConnect = () => {
        window.location.href = '/api/auth/google'
    }

    const handleDisconnect = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoading(false); return }
        await fetch('/api/calendar/disconnect', { method: 'DELETE' })
        setConnected(false)
        toast.success('Google Calendar disconnected')
        setLoading(false)
    }

    if (connected === null) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="w-5 h-5 text-slate-300 animate-pulse" />
                <div className="flex-1 space-y-1">
                    <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3 w-48 rounded bg-slate-100 animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Calendar className={`w-5 h-5 ${connected ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">Google Calendar</p>
                        {connected && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Connected
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {connected
                            ? 'Follow-up notes sync automatically to your calendar.'
                            : 'Sync follow-ups as Google Calendar events.'}
                    </p>
                </div>
            </div>

            {connected ? (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs gap-1.5"
                >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect
                </Button>
            ) : (
                <Button
                    size="sm"
                    onClick={handleConnect}
                    className="gap-1.5 text-xs"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Connect
                </Button>
            )}
        </div>
    )
}
