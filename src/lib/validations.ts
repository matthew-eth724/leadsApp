import { z } from 'zod'

export const leadSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    company: z.string().optional(),
    source: z
        .enum(['Website', 'Referral', 'LinkedIn', 'Cold Outreach', 'Event', 'Other', ''])
        .optional(),
    stage_id: z.string().uuid().optional().nullable(),
    value: z
        .union([z.number().positive('Value must be positive'), z.nan()])
        .optional()
        .nullable(),
    tags: z.string().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
})

export const noteSchema = z.object({
    lead_id: z.string().uuid(),
    content: z.string().min(1, 'Note content is required'),
    follow_up_date: z.string().optional().nullable(),
})

export const stageSchema = z.object({
    name: z.string().min(1, 'Stage name is required'),
    color: z.string().min(1, 'Color is required'),
    order: z.number().int().nonnegative(),
})

export type LeadFormData = z.infer<typeof leadSchema>
export type NoteFormData = z.infer<typeof noteSchema>
export type StageFormData = z.infer<typeof stageSchema>
