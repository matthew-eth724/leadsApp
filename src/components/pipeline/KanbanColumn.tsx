'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Building, DollarSign, Calendar, ChevronRight } from 'lucide-react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { formatCurrency, parseTags, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TagBadge } from '@/components/shared/TagBadge'
import { LeadForm } from '@/components/leads/LeadForm'
import Link from 'next/link'
import { format, isToday, isPast } from 'date-fns'

interface Note { id: string; follow_up_date: string | null }
interface Lead {
    id: string; name: string; company: string; value: number | null; tags: string | null;
    stage_id: string; notes?: Note[]
}
interface Stage { id: string; name: string; color: string; order: number }

interface KanbanColumnProps {
    stage: Stage
    leads: Lead[]
    onLeadMoved: () => void
}

export function KanbanColumn({ stage, leads, onLeadMoved }: KanbanColumnProps) {
    const queryClient = useQueryClient()
    const [addLeadOpen, setAddLeadOpen] = useState(false)

    const totalValue = leads.reduce((sum, l) => sum + (l.value ?? 0), 0)

    const nearestFollowUp = (lead: Lead) => {
        const dates = (lead.notes ?? [])
            .filter((n) => n.follow_up_date)
            .map((n) => n.follow_up_date!)
            .sort()
        return dates[0] || null
    }

    return (
        <div className="flex flex-col w-80 flex-shrink-0 animate-entrance">
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-4 mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-2.5 h-6 rounded-full shadow-sm"
                        style={{ backgroundColor: stage.color }}
                    />
                    <div>
                        <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-widest leading-none mb-1">{stage.name}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
                            </span>
                            {totalValue > 0 && (
                                <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{formatCurrency(totalValue)}</span>
                            )}
                        </div>
                    </div>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all group"
                    onClick={() => setAddLeadOpen(true)}
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                </Button>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                            "flex-1 min-h-[300px] p-3 space-y-4 rounded-[2rem] border-2 transition-all duration-300 overflow-y-auto custom-scrollbar",
                            snapshot.isDraggingOver
                                ? "bg-slate-100/50 border-primary/20 shadow-inner scale-[1.01]"
                                : "bg-slate-50/40 border-slate-100/50"
                        )}
                    >
                        {leads.map((lead, index) => {
                            const followUp = nearestFollowUp(lead)
                            const isOverdue = followUp && isPast(new Date(followUp + 'T00:00:00')) && !isToday(new Date(followUp + 'T00:00:00'))
                            return (
                                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                                "bg-white rounded-3xl p-5 shadow-sm border border-slate-100 ring-primary/5 transition-all duration-300 cursor-grab active:cursor-grabbing group selective-glass",
                                                snapshot.isDragging
                                                    ? "shadow-2xl border-primary/30 ring-4 rotate-2 scale-105"
                                                    : "hover:shadow-premium hover:border-slate-200 hover:-translate-y-1"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <Link href={`/leads/${lead.id}`} onClick={(e) => snapshot.isDragging && e.preventDefault()} className="flex-1">
                                                    <p className="font-black text-slate-900 text-[15px] leading-tight group-hover:text-primary transition-colors">{lead.name}</p>
                                                </Link>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                            </div>

                                            <div className="space-y-2">
                                                {lead.company && (
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Building className="w-3 h-3 text-slate-300" />{lead.company}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-3">
                                                    {lead.value != null && lead.value > 0 ? (
                                                        <div className="flex items-center gap-1.5 text-[13px] font-black text-slate-800">
                                                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />{formatCurrency(lead.value)}
                                                        </div>
                                                    ) : <div />}

                                                    {followUp && (
                                                        <div className={cn(
                                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                                                            isOverdue ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                                        )}>
                                                            <Calendar className="w-3 h-3" />
                                                            {isToday(new Date(followUp + 'T00:00:00'))
                                                                ? 'Due Today'
                                                                : format(new Date(followUp + 'T00:00:00'), 'MMM d')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {lead.tags && (
                                                <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-1">
                                                    <TagBadge tags={lead.tags} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })}
                        {provided.placeholder}

                        {leads.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-100 rounded-[1.5rem] opacity-40">
                                <Building className="w-6 h-6 text-slate-300 mb-2" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Drag leads<br />here</p>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>

            <LeadForm
                open={addLeadOpen}
                onOpenChange={setAddLeadOpen}
                defaultStageId={stage.id}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['pipeline'] })}
            />
        </div>
    )
}
