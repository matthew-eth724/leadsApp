'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Filter, Trash2, ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadForm } from '@/components/leads/LeadForm'

interface Stage { id: string; name: string; color: string; order: number }
interface Lead {
    id: string; name: string; email: string; phone: string; company: string;
    source: string; stage_id: string; value: number; tags: string;
    created_at: string; updated_at: string; stages?: Stage
}

type SortField = 'name' | 'company' | 'source' | 'value' | 'created_at'
type SortOrder = 'asc' | 'desc'

export function LeadTable() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const supabase = createClient()

    const [search, setSearch] = useState('')
    const [stageFilter, setStageFilter] = useState('')
    const [sourceFilter, setSourceFilter] = useState('')
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    const [selected, setSelected] = useState<string[]>([])
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [editLeadId, setEditLeadId] = useState<string | null>(null)

    const { data: stages } = useQuery({
        queryKey: ['stages'],
        queryFn: async () => {
            const { data } = await supabase.from('stages').select('*').order('"order"', { ascending: true })
            return data as Stage[]
        },
    })

    const { data, isLoading } = useQuery({
        queryKey: ['leads', search, stageFilter, sourceFilter, sortField, sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams({
                search, sortBy: sortField, sortOrder,
                ...(stageFilter && stageFilter !== 'all' ? { stage: stageFilter } : {}),
                ...(sourceFilter && sourceFilter !== 'all' ? { source: sourceFilter } : {}),
            })
            const res = await fetch(`/api/leads?${params}`)
            return res.json() as Promise<{ leads: Lead[]; total: number }>
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
        },
        onSuccess: () => {
            toast.success('Lead deleted')
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            setDeleteId(null)
        },
        onError: () => toast.error('Failed to delete lead'),
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: async () => {
            await Promise.all(selected.map((id) => fetch(`/api/leads/${id}`, { method: 'DELETE' })))
        },
        onSuccess: () => {
            toast.success(`${selected.length} leads deleted`)
            setSelected([])
            setBulkDeleteOpen(false)
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        },
    })

    const bulkStageMutation = useMutation({
        mutationFn: async (stageId: string) => {
            await Promise.all(
                selected.map((id) =>
                    fetch(`/api/leads/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stage_id: stageId }),
                    })
                )
            )
        },
        onSuccess: () => {
            toast.success(`Stage updated for ${selected.length} leads`)
            setSelected([])
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        },
    })

    const leads = data?.leads ?? []
    const total = data?.total ?? 0

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortOrder('asc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />
        return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    }

    const allSelected = leads.length > 0 && selected.length === leads.length
    const toggleAll = () => setSelected(allSelected ? [] : leads.map((l) => l.id))
    const toggleOne = (id: string) =>
        setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

    const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Outreach', 'Event', 'Other']

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search leads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-11 rounded-2xl border-slate-100 shadow-sm focus:ring-primary/20"
                    />
                </div>
                <Select value={stageFilter || 'all'} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-44 h-11 rounded-2xl border-slate-100 shadow-sm">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-slate-100">
                        <SelectItem value="all">All stages</SelectItem>
                        {stages?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={sourceFilter || 'all'} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-44 h-11 rounded-2xl border-slate-100 shadow-sm">
                        <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-slate-100">
                        <SelectItem value="all">All sources</SelectItem>
                        {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Bulk Actions */}
            {selected.length > 0 && (
                <div className="flex items-center gap-4 p-4 glass-morphism rounded-2xl border-primary/10 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                            {selected.length}
                        </div>
                        <span className="text-sm font-bold text-slate-700">leads selected</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 mx-2" />
                    <Select onValueChange={(v) => bulkStageMutation.mutate(v)}>
                        <SelectTrigger className="w-44 h-9 text-xs rounded-xl shadow-sm">
                            <SelectValue placeholder="Move to stage" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                            {stages?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-9 px-4 rounded-xl">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="h-9 px-4 rounded-xl text-slate-500">Cancel</Button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-3xl border border-slate-100/60 bg-white shadow-premium overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : leads.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="No leads matches your search"
                        description={search || stageFilter || sourceFilter ? 'Try clearing your filters' : 'Your lead universe is currently empty'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50/50 backdrop-blur-sm sticky top-0 z-10">
                                <tr>
                                    <th className="pl-6 pr-2 py-4 text-left w-12 border-b border-slate-100">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleAll}
                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                    </th>
                                    {[
                                        { key: 'name', label: 'Contact' },
                                        { key: 'company', label: 'Organization' },
                                    ].map(({ key, label }) => (
                                        <th
                                            key={key}
                                            className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors border-b border-slate-100 whitespace-nowrap"
                                            onClick={() => toggleSort(key as SortField)}
                                        >
                                            <span className="flex items-center gap-2">{label}<SortIcon field={key as SortField} /></span>
                                        </th>
                                    ))}
                                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px] border-b border-slate-100">Status</th>
                                    <th
                                        className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors border-b border-slate-100 whitespace-nowrap"
                                        onClick={() => toggleSort('source')}
                                    >
                                        <span className="flex items-center gap-2">Origin<SortIcon field="source" /></span>
                                    </th>
                                    <th
                                        className="px-4 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors border-b border-slate-100 whitespace-nowrap"
                                        onClick={() => toggleSort('value')}
                                    >
                                        <span className="flex items-center justify-end gap-2">Estimated Value<SortIcon field="value" /></span>
                                    </th>
                                    <th
                                        className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors border-b border-slate-100 whitespace-nowrap"
                                        onClick={() => toggleSort('created_at')}
                                    >
                                        <span className="flex items-center gap-2">Acquired On<SortIcon field="created_at" /></span>
                                    </th>
                                    <th className="px-4 py-4 w-12 border-b border-slate-100" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        className="hover:bg-slate-50/80 cursor-pointer group transition-all duration-200 hover:shadow-inner"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('[data-no-navigate]')) return
                                            router.push(`/leads/${lead.id}`)
                                        }}
                                    >
                                        <td className="pl-6 pr-2 py-5" data-no-navigate>
                                            <Checkbox
                                                checked={selected.includes(lead.id)}
                                                onCheckedChange={() => toggleOne(lead.id)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">{lead.name}</div>
                                            {lead.email && <div className="text-[11px] font-medium text-slate-400 mt-0.5">{lead.email}</div>}
                                        </td>
                                        <td className="px-4 py-5 font-semibold text-slate-600">{lead.company || <span className="text-slate-300 opacity-50 italic">Personal</span>}</td>
                                        <td className="px-4 py-5">
                                            {lead.stages ? (
                                                <span
                                                    className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-white shadow-sm"
                                                    style={{ backgroundColor: lead.stages.color }}
                                                >
                                                    {lead.stages.name}
                                                </span>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-5 font-bold text-slate-600 tracking-tight">{lead.source || 'Direct'}</td>
                                        <td className="px-4 py-5 text-right font-black text-slate-900 tabular-nums">
                                            {formatCurrency(lead.value)}
                                        </td>
                                        <td className="px-4 py-5 text-slate-500 font-medium text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                                        <td className="px-4 py-5" data-no-navigate>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                                                    <DropdownMenuItem className="font-medium" onClick={() => router.push(`/leads/${lead.id}`)}>View Profile</DropdownMenuItem>
                                                    <DropdownMenuItem className="font-medium" onClick={() => setEditLeadId(lead.id)}>Update Info</DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-rose-600 font-bold"
                                                        onClick={() => setDeleteId(lead.id)}
                                                    >Archive Lead</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer */}
                {!isLoading && leads.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Showing {leads.length} of {total} leads matched</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live Data Sync</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Lead"
                description="This action cannot be undone. This will permanently delete this lead and all associated notes."
                confirmLabel="Delete"
                destructive
                loading={deleteMutation.isPending}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
            />
            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                title={`Delete ${selected.length} Leads`}
                description="This will permanently delete all selected leads and their notes. This cannot be undone."
                confirmLabel="Delete All"
                destructive
                loading={bulkDeleteMutation.isPending}
                onConfirm={() => bulkDeleteMutation.mutate()}
            />

            {/* Edit Form */}
            <LeadForm
                open={!!editLeadId}
                onOpenChange={(open) => !open && setEditLeadId(null)}
                leadId={editLeadId ?? undefined}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['leads'] })
                    setEditLeadId(null)
                }}
            />
        </div>
    )
}
