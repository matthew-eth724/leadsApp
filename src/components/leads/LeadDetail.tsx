'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Edit2, Trash2, Phone, Mail, Building, DollarSign, Tag, Calendar, ArrowLeft, Layers } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagBadge } from '@/components/shared/TagBadge'
import { LeadForm } from '@/components/leads/LeadForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { NoteList } from '@/components/notes/NoteList'
import { NoteForm } from '@/components/notes/NoteForm'
import { useRouter } from 'next/navigation'

interface FieldDefinition { id: string; name: string; label: string; field_type: string }
interface Stage { id: string; name: string; color: string }
interface Note { id: string; content: string; follow_up_date: string | null; created_at: string }
interface Lead {
    id: string; name: string; email: string; phone: string; company: string;
    source: string; stage_id: string; value: number; tags: string | null;
    custom_fields?: Record<string, unknown>;
    created_at: string; updated_at: string; stages?: Stage; notes?: Note[]
}

interface LeadDetailProps { leadId: string }

export function LeadDetail({ leadId }: LeadDetailProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const supabase = createClient()
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const { data: lead, isLoading } = useQuery<Lead>({
        queryKey: ['lead', leadId],
        queryFn: async () => {
            const res = await fetch(`/api/leads/${leadId}`)
            const data = await res.json()
            return data.lead
        },
    })

    const { data: fieldDefs } = useQuery<FieldDefinition[]>({
        queryKey: ['field-definitions'],
        queryFn: async () => {
            const res = await fetch('/api/field-definitions')
            const json = await res.json()
            return json.fields ?? []
        },
    })

    const { data: stages } = useQuery({
        queryKey: ['stages'],
        queryFn: async () => {
            const { data } = await supabase.from('stages').select('*').order('"order"', { ascending: true })
            return data as Stage[]
        },
    })

    const stageMutation = useMutation({
        mutationFn: async (stageId: string) => {
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: stageId }),
            })
            if (!res.ok) throw new Error('Failed to update stage')
        },
        onSuccess: () => {
            toast.success('Stage updated')
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
        },
        onSuccess: () => {
            toast.success('Lead deleted')
            router.push('/leads')
        },
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!lead) return <div className="text-slate-500">Lead not found.</div>

    return (
        <div>
            {/* Back + Actions */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/leads">
                    <Button variant="ghost" size="sm" className="gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Back to Leads
                    </Button>
                </Link>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Lead Info */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl">{lead.name}</CardTitle>
                                    {lead.company && (
                                        <p className="text-slate-500 mt-0.5 flex items-center gap-1.5">
                                            <Building className="w-3.5 h-3.5" /> {lead.company}
                                        </p>
                                    )}
                                </div>
                                {/* Stage selector */}
                                <Select value={lead.stage_id || ''} onValueChange={(v) => stageMutation.mutate(v)}>
                                    <SelectTrigger className="w-44">
                                        <div className="flex items-center gap-2">
                                            {lead.stages && (
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lead.stages.color }} />
                                            )}
                                            <SelectValue placeholder="Set stage" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages?.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                    {s.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {lead.email && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                                    </div>
                                )}
                                {lead.phone && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <a href={`https://wa.me/234${lead.phone}`} className="text-slate-700">{lead.phone}</a>
                                    </div>
                                )}
                                {lead.value != null && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span className="font-semibold text-slate-900">{formatCurrency(lead.value)}</span>
                                    </div>
                                )}
                                {lead.source && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <span className="text-slate-700">{lead.source}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2.5 text-sm">
                                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span className="text-slate-500">Added {formatDate(lead.created_at)}</span>
                                </div>
                            </div>
                            {lead.tags && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-medium text-slate-500 mb-2">Tags</p>
                                    <TagBadge tags={lead.tags} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Custom Fields Card */}
                    {fieldDefs && fieldDefs.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    Custom Fields
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {fieldDefs.map((field) => {
                                        const value = lead.custom_fields?.[field.name]
                                        if (!value && value !== 0) return null
                                        return (
                                            <div key={field.id} className="space-y-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field.label}</p>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {field.field_type === 'url'
                                                        ? <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{String(value)}</a>
                                                        : String(value)
                                                    }
                                                </p>
                                            </div>
                                        )
                                    })}
                                    {fieldDefs.every((f) => !lead.custom_fields?.[f.name] && lead.custom_fields?.[f.name] !== 0) && (
                                        <p className="text-sm text-slate-400 col-span-2 italic">No custom field values set.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Right: Notes */}
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Notes &amp; Follow-ups</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <NoteList notes={lead.notes ?? []} leadId={leadId} />
                            <NoteForm leadId={leadId} leadName={lead.name} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <LeadForm
                open={editOpen}
                onOpenChange={setEditOpen}
                leadId={leadId}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                    queryClient.invalidateQueries({ queryKey: ['leads'] })
                }}
            />
            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Lead"
                description="This will permanently delete this lead and all its notes. This cannot be undone."
                confirmLabel="Delete"
                destructive
                loading={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate()}
            />
        </div>
    )
}
