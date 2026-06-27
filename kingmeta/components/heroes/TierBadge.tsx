import { cn } from '@/lib/utils'
import type { TierLevel } from '@/types'

const TIER_STYLES: Record<string, string> = {
  'T0':   'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/30',
  'T0.5': 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-orange-400/30',
  'T1':   'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-yellow-400/30',
  'T1.5': 'bg-gradient-to-r from-lime-400 to-green-500 text-black shadow-lime-400/30',
  'T2':   'bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-emerald-400/30',
  'T3':   'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-blue-400/30',
  'T4':   'bg-gradient-to-r from-slate-500 to-slate-600 text-white',
}

interface Props {
  tier: TierLevel | string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function TierBadge({ tier, size = 'md', className }: Props) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES['T4']
  return (
    <span className={cn(
      'inline-flex items-center justify-center font-bold rounded-md shadow-lg',
      size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
      size === 'md' && 'px-2 py-0.5 text-xs',
      size === 'lg' && 'px-3 py-1 text-sm',
      style,
      className
    )}>
      {tier}
    </span>
  )
}
