import { AppShell } from '@/components/providers/AppShell'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>
}
