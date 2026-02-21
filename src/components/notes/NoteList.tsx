'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Edit2, Trash2, Calendar, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface Note {
    id: string
    content: string
    follow_up_date: string | null
    created_at: string
}

interface NoteListProps {
    notes: Note[]
    leadId: string
}

export function NoteList({ notes, leadId }: NoteListProps) {
    const queryClient = useQueryClient()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [editFollowUp, setEditFollowUp] = useState('')
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const updateMutation = useMutation({
        mutationFn: async ({ id, content, follow_up_date }: { id: string; content: string; follow_up_date: string }) => {
            const res = await fetch(`/api/notes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, follow_up_date: follow_up_date || null }),
            })
            if (!res.ok) throw new Error('Failed to update note')
        },
        onSuccess: () => {
            toast.success('Note updated')
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
            setEditingId(null)
        },
        onError: () => toast.error('Failed to update note'),
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete note')
        },
        onSuccess: () => {
            toast.success('Note deleted')
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
            setDeleteId(null)
        },
        onError: () => toast.error('Failed to delete note'),
    })

    const startEdit = (note: Note) => {
        setEditingId(note.id)
        setEditContent(note.content)
        setEditFollowUp(note.follow_up_date ?? '')
    }

    if (notes.length === 0) {
        return (
            <div className="text-center py-6 text-slate-400 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No notes yet
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    {editingId === note.id ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                            />
                            <div className="space-y-1">
                                <Label className="text-xs">Follow-up Date</Label>
                                <Input
                                    type="date"
                                    value={editFollowUp}
                                    onChange={(e) => setEditFollowUp(e.target.value)}
                                    className="h-7 text-xs"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => updateMutation.mutate({ id: note.id, content: editContent, follow_up_date: editFollowUp })}
                                    disabled={updateMutation.isPending}
                                >
                                    Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                            {note.follow_up_date && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600 font-medium">
                                    <Calendar className="w-3 h-3" />
                                    Follow-up: {format(new Date(note.follow_up_date + 'T00:00:00'), 'MMM d, yyyy')}
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-400">
                                    {format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
                                </span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(note)}>
                                        <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-600"
                                        onClick={() => setDeleteId(note.id)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ))}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Note"
                description="Are you sure you want to delete this note?"
                confirmLabel="Delete"
                destructive
                loading={deleteMutation.isPending}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
            />
        </div>
    )
}
