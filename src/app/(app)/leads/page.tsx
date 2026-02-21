'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function LeadsPage() {
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)

    return (
        <div className="animate-fade-in">
            <Header
                title="Leads"
                subtitle="Manage and track all your leads"
                actions={
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-1.5" /> Add Lead
                    </Button>
                }
            />
            <LeadTable />
            <LeadForm
                open={showForm}
                onOpenChange={setShowForm}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
            />
        </div>
    )
}
