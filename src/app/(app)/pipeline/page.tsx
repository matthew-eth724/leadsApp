'use client'

import { Header } from '@/components/layout/Header'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'

export default function PipelinePage() {
    return (
        <div className="animate-fade-in">
            <Header title="Pipeline" subtitle="Drag and drop leads between stages" />
            <KanbanBoard />
        </div>
    )
}
