'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { KanbanColumn } from '@/components/pipeline/KanbanColumn'
import { EmptyState } from '@/components/shared/EmptyState'
import { Kanban } from 'lucide-react'

interface Note { id: string; follow_up_date: string | null }
interface Lead {
    id: string; name: string; company: string; value: number | null;
    tags: string | null; stage_id: string; notes?: Note[]
}
interface Stage { id: string; name: string; color: string; order: number }

export function KanbanBoard() {
    const queryClient = useQueryClient()
    const supabase = createClient()
    const [localLeads, setLocalLeads] = useState<Lead[] | null>(null)

    const { data: stages, isLoading: stagesLoading } = useQuery<Stage[]>({
        queryKey: ['stages'],
        queryFn: async (): Promise<Stage[]> => {
            const { data } = await supabase.from('stages').select('*').order('"order"', { ascending: true })
            return (data ?? []) as Stage[]
        },
    })

    const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
        queryKey: ['pipeline'],
        queryFn: async (): Promise<Lead[]> => {
            const { data } = await supabase
                .from('leads')
                .select('*, notes(id, follow_up_date)')
            return (data ?? []) as Lead[]
        },
    })

    useEffect(() => {
        if (leads) setLocalLeads(leads)
    }, [leads])

    const stageMutation = useMutation({
        mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: stageId }),
            })
            if (!res.ok) throw new Error('Failed to move lead')
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        onError: () => {
            toast.error('Failed to move lead')
            setLocalLeads(leads ?? [])
        },
    })

    const onDragEnd = (result: DropResult) => {
        const { draggableId, destination } = result
        if (!destination) return
        const newStageId = destination.droppableId
        const current = localLeads ?? leads ?? []
        const lead = current.find((l) => l.id === draggableId)
        if (!lead || lead.stage_id === newStageId) return

        // Optimistic update
        setLocalLeads(current.map((l) => l.id === draggableId ? { ...l, stage_id: newStageId } : l))
        stageMutation.mutate({ leadId: draggableId, stageId: newStageId })
    }

    const displayLeads = localLeads ?? leads ?? []
    const isLoading = stagesLoading || leadsLoading

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!stages?.length) {
        return <EmptyState icon={Kanban} title="No stages configured" description="Add stages in Settings to use the pipeline view." />
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
                {stages.map((stage) => (
                    <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        leads={displayLeads.filter((l) => l.stage_id === stage.id)}
                        onLeadMoved={() => queryClient.invalidateQueries({ queryKey: ['pipeline'] })}
                    />
                ))}
            </div>
        </DragDropContext>
    )
}
