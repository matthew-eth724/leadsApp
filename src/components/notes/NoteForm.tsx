'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Send, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NoteFormProps {
    leadId: string
    leadName?: string
}

export function NoteForm({ leadId, leadName }: NoteFormProps) {
    const queryClient = useQueryClient()
    const [content, setContent] = useState('')
    const [followUpDate, setFollowUpDate] = useState('')
    const [addToCalendar, setAddToCalendar] = useState(false)

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId, content, follow_up_date: followUpDate || null }),
            })
            if (!res.ok) throw new Error('Failed to add note')
            const data = await res.json()
            return data.note
        },
        onSuccess: async (note) => {
            toast.success('Note added')

            // If calendar toggle is on and a follow-up date is set, create the calendar event
            if (addToCalendar && followUpDate && note?.id) {
                try {
                    const calRes = await fetch('/api/calendar/events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: `Follow-up${leadName ? `: ${leadName}` : ''}`,
                            date: followUpDate,
                            description: content,
                        }),
                    })
                    if (!calRes.ok) {
                        const json = await calRes.json()
                        if (json.error?.includes('No Google Calendar connection')) {
                            toast.warning('Note saved, but Google Calendar is not connected. Connect it in Settings → Integrations.')
                        } else {
                            toast.warning('Note saved, but calendar event failed: ' + (json.error || 'unknown error'))
                        }
                    } else {
                        toast.success('Follow-up added to Google Calendar!')
                    }
                } catch {
                    toast.warning('Note saved, but calendar sync failed.')
                }
            }

            setContent('')
            setFollowUpDate('')
            setAddToCalendar(false)
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
        },
        onError: () => toast.error('Failed to add note'),
    })

    return (
        <div className="space-y-2 pt-3 border-t border-slate-100">
            <Textarea
                placeholder="Add a note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
            />
            <div className="space-y-1">
                <Label className="text-xs text-slate-500">Follow-up Date (optional)</Label>
                <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-7 text-sm"
                />
            </div>

            {/* Calendar checkbox — only visible when a follow-up date is set */}
            {followUpDate && (
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={addToCalendar}
                        onChange={(e) => setAddToCalendar(e.target.checked)}
                        className="rounded"
                    />
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Add to Google Calendar
                </label>
            )}

            <Button
                size="sm"
                onClick={() => mutation.mutate()}
                disabled={!content.trim() || mutation.isPending}
                className="w-full"
            >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {mutation.isPending ? 'Saving...' : 'Add Note'}
            </Button>
        </div>
    )
}
