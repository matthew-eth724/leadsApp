'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Mail, Lock } from 'lucide-react'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirm) {
            toast.error('Passwords do not match')
            return
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
            toast.error(error.message)
            setLoading(false)
            return
        }
        setDone(true)
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo / Brand */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl mb-4">
                    <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">LeadFlow</h1>
                <p className="text-slate-400 mt-1 text-sm">Create your workspace</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                {done ? (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                            <Mail className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Check your email</h2>
                        <p className="text-slate-400 text-sm">
                            We sent a confirmation link to <span className="text-blue-400 font-semibold">{email}</span>.
                            Click the link to activate your account.
                        </p>
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors block">
                            ← Back to sign in
                        </Link>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleRegister} className="space-y-5">
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
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-200 font-semibold text-sm">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder="Repeat your password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
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
                                {loading ? 'Creating account...' : 'Create Account'}
                            </Button>
                        </form>
                        <p className="text-center text-slate-400 text-sm mt-6">
                            Already have an account?{' '}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
