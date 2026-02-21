import { cn, parseTags } from '@/lib/utils'

interface TagBadgeProps {
    tags: string | null | undefined
    className?: string
}

const TAG_COLORS = [
    'bg-indigo-50 text-indigo-700 border-indigo-100',
    'bg-violet-50 text-violet-700 border-violet-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-rose-50 text-rose-700 border-rose-100',
    'bg-cyan-50 text-cyan-700 border-cyan-100',
]

function getTagColor(tag: string): string {
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export function TagBadge({ tags, className }: TagBadgeProps) {
    const tagList = parseTags(tags)
    if (tagList.length === 0) return null
    return (
        <div className={cn('flex flex-wrap gap-1.5', className)}>
            {tagList.map((tag) => (
                <span
                    key={tag}
                    className={cn(
                        'inline-flex items-center rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border shadow-sm transition-all hover:scale-105',
                        getTagColor(tag)
                    )}
                >
                    {tag}
                </span>
            ))}
        </div>
    )
}

export function SingleTagBadge({ tag, className }: { tag: string; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border shadow-sm transition-all hover:scale-105',
                getTagColor(tag),
                className
            )}
        >
            {tag}
        </span>
    )
}
