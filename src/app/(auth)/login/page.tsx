'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogIn, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            toast.error(error.message || 'Invalid credentials')
            setLoading(false)
            return
        }
        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo / Brand */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl mb-4">
                    <LogIn className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">LeadFlow</h1>
                <p className="text-slate-400 mt-1 text-sm">Sign in to your workspace</p>
            </div>

            {/* Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <Label className="text-slate-200 font-semibold text-sm">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-slate-200 font-semibold text-sm">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 rounded-xl"
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl h-11 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 border-0 font-bold text-base shadow-lg shadow-blue-500/30 transition-all"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>
                <p className="text-center text-slate-400 text-sm mt-6">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}
