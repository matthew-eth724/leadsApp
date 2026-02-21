'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Users,
    Kanban,
    LayoutDashboard,
    Settings,
    Plus,
    ChevronLeft,
    ChevronRight,
    Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { LeadForm } from '@/components/leads/LeadForm'

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Pipeline', icon: Kanban, href: '/pipeline' },
    { label: 'Leads', icon: Users, href: '/leads' },
    { label: 'Settings', icon: Settings, href: '/settings' },
]

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [addLeadOpen, setAddLeadOpen] = useState(false)
    const pathname = usePathname()
    const supabase = createClient()

    const { data: leadCount } = useQuery({
        queryKey: ['lead-count'],
        queryFn: async () => {
            const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
            return count ?? 0
        },
    })

    return (
        <>
            {/* Sidebar Desktop */}
            <aside
                className={cn(
                    'hidden md:flex flex-col h-screen transition-all duration-500 ease-in-out z-40 relative border-r bg-slate-950',
                    collapsed ? 'w-20' : 'w-64'
                )}
            >
                {/* Visual Glass Overlay */}
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl pointer-events-none" />

                <div className="relative flex flex-col h-full z-10">
                    {/* Brand Header */}
                    <div className="flex items-center gap-3 px-6 py-8">
                        <div className="bg-primary/20 p-2 rounded-xl border border-white/10 shadow-lg shrink-0">
                            <Target className="w-6 h-6 text-primary" />
                        </div>
                        {!collapsed && (
                            <span className="font-bold text-xl tracking-tight text-white whitespace-nowrap animate-in fade-in duration-700">
                                Lead<span className="text-primary-foreground/80">Flow</span>
                            </span>
                        )}
                    </div>

                    {/* Global Action */}
                    <div className="px-4 mb-8">
                        <Button
                            onClick={() => setAddLeadOpen(true)}
                            size={collapsed ? 'icon' : 'default'}
                            className={cn(
                                'w-full bg-primary/90 hover:bg-primary shadow-xl hover:shadow-primary/20 transition-all duration-300 group overflow-hidden',
                                !collapsed ? 'rounded-2xl gap-2' : 'rounded-xl h-12 w-12 mx-auto'
                            )}
                        >
                            <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                            {!collapsed && <span className="font-semibold">Add New Lead</span>}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative',
                                        isActive
                                            ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                                    )}
                                >
                                    <item.icon className={cn(
                                        'w-5 h-5 transition-transform duration-300 group-hover:scale-110 shrink-0',
                                        isActive ? 'text-primary' : 'group-hover:text-slate-200'
                                    )} />
                                    {!collapsed && <span className="font-medium text-[15px]">{item.label}</span>}

                                    {/* Active Indicator bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-primary/50 shadow-md" />
                                    )}

                                    {item.label === 'Leads' && leadCount !== undefined && !collapsed && (
                                        <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/10">
                                            {leadCount}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Collapse Controls */}
                    <div className="p-4 border-t border-white/5 mt-auto">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="flex items-center justify-center w-full p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors group"
                        >
                            {collapsed ? (
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="text-sm font-medium">Collapse</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-white/5 px-2 pb-safe z-50 backdrop-blur-xl">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative',
                                isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-100'
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                            {isActive && (
                                <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full shadow-primary shadow-sm" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            <LeadForm open={addLeadOpen} onOpenChange={setAddLeadOpen} />
        </>
    )
}
