'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NoteFormProps {
    leadId: string
}

export function NoteForm({ leadId }: NoteFormProps) {
    const queryClient = useQueryClient()
    const [content, setContent] = useState('')
    const [followUpDate, setFollowUpDate] = useState('')

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId, content, follow_up_date: followUpDate || null }),
            })
            if (!res.ok) throw new Error('Failed to add note')
        },
        onSuccess: () => {
            toast.success('Note added')
            setContent('')
            setFollowUpDate('')
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
