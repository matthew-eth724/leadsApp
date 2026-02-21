'use client'

import { Sidebar } from '@/components/layout/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto w-full transition-all duration-500 ease-in-out">
                <div className="p-6 pb-20 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
