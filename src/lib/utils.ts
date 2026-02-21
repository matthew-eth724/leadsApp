import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value)
}

export function formatDate(date: string | null | undefined): string {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export function parseTags(tags: string | null | undefined): string[] {
    if (!tags) return []
    return tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
}
