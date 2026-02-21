import { LeadDetail } from '@/components/leads/LeadDetail'

interface LeadPageProps {
    params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadPageProps) {
    const { id } = await params
    return (
        <div className="animate-fade-in">
            <LeadDetail leadId={id} />
        </div>
    )
}
