'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { leadSchema, type LeadFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface FieldDefinition {
    id: string
    name: string
    label: string
    field_type: 'text' | 'number' | 'url' | 'date'
    required: boolean
    order: number
}

interface LeadFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    leadId?: string
    defaultStageId?: string
}

const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Outreach', 'Event', 'Other']

export function LeadForm({ open, onOpenChange, onSuccess, leadId, defaultStageId }: LeadFormProps) {
    const isEditing = !!leadId
    const supabase = createClient()

    const { data: stages } = useQuery({
        queryKey: ['stages'],
        queryFn: async () => {
            const { data } = await supabase.from('stages').select('*').order('"order"', { ascending: true })
            return data ?? []
        },
    })

    const { data: fieldDefs } = useQuery<FieldDefinition[]>({
        queryKey: ['field-definitions'],
        queryFn: async () => {
            const res = await fetch('/api/field-definitions')
            const json = await res.json()
            return json.fields ?? []
        },
    })

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadSchema),
        defaultValues: { name: '', email: '', phone: '', company: '', source: '', stage_id: defaultStageId || null, value: null, tags: '', custom_fields: {} },
    })

    useEffect(() => {
        if (isEditing && open) {
            supabase.from('leads').select('*').eq('id', leadId).single().then(({ data }) => {
                if (data) reset({ ...data, custom_fields: (data.custom_fields as Record<string, unknown>) ?? {} })
            })
        } else if (!isEditing && open) {
            reset({ name: '', email: '', phone: '', company: '', source: '', stage_id: defaultStageId || null, value: null, tags: '', custom_fields: {} })
        }
    }, [leadId, open, isEditing, defaultStageId])

    const onSubmit = async (data: LeadFormData) => {
        try {
            const payload = {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                company: data.company || null,
                source: data.source || null,
                stage_id: data.stage_id || null,
                value: data.value ?? null,
                tags: data.tags || null,
                custom_fields: data.custom_fields ?? {},
            }

            const url = isEditing ? `/api/leads/${leadId}` : '/api/leads'
            const method = isEditing ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to save lead')
            }

            toast.success(isEditing ? 'Lead updated!' : 'Lead created!')
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong')
        }
    }

    const stageId = watch('stage_id')
    const source = watch('source')
    const customFields = watch('custom_fields') ?? {}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black">{isEditing ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Core Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                            <Input id="name" {...register('name')} placeholder="John Smith" />
                            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                        </div>
                        {/* Company */}
                        <div className="space-y-1.5">
                            <Label htmlFor="company">Company</Label>
                            <Input id="company" {...register('company')} placeholder="Acme Corp" />
                        </div>
                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register('email')} placeholder="john@acme.com" />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>
                        {/* Phone */}
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" {...register('phone')} placeholder="+1 555 000 0000" />
                        </div>
                        {/* Source */}
                        <div className="space-y-1.5">
                            <Label>Source</Label>
                            <Select value={source || 'none'} onValueChange={(v) => setValue('source', v === 'none' ? '' : v as LeadFormData['source'])}>
                                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Stage */}
                        <div className="space-y-1.5">
                            <Label>Stage</Label>
                            <Select value={stageId || 'none'} onValueChange={(v) => setValue('stage_id', v === 'none' ? null : v)}>
                                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {stages?.map((s: { id: string; name: string; color: string }) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                                                {s.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Value */}
                        <div className="space-y-1.5">
                            <Label htmlFor="value">Estimated Value ($)</Label>
                            <Input
                                id="value"
                                type="number"
                                min={0}
                                step="0.01"
                                {...register('value', { setValueAs: (v) => (v === '' ? null : parseFloat(v)) })}
                                placeholder="5000"
                            />
                            {errors.value && <p className="text-xs text-red-500">{errors.value.message}</p>}
                        </div>
                        {/* Tags */}
                        <div className="space-y-1.5">
                            <Label htmlFor="tags">Tags</Label>
                            <Input id="tags" {...register('tags')} placeholder="enterprise, hot, follow-up" />
                            <p className="text-xs text-slate-400">Comma-separated</p>
                        </div>
                    </div>

                    {/* Custom Fields */}
                    {fieldDefs && fieldDefs.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-100" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Fields</p>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {fieldDefs.map((field) => (
                                    <div key={field.id} className="space-y-1.5">
                                        <Label htmlFor={`cf-${field.name}`}>
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </Label>
                                        <Input
                                            id={`cf-${field.name}`}
                                            type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.field_type === 'url' ? 'url' : 'text'}
                                            placeholder={field.label}
                                            value={(customFields[field.name] as string) ?? ''}
                                            onChange={(e) => {
                                                const updated = { ...customFields, [field.name]: e.target.value }
                                                setValue('custom_fields', updated)
                                            }}
                                            required={field.required}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-6 gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : isEditing ? 'Update Lead' : 'Create Lead'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
