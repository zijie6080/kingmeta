import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TierLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Compute meta_score = 0.5×win_rate + 0.3×pick_rate + 0.2×ban_rate
export function computeMetaScore(win: number, pick: number, ban: number): number {
  return +(0.5 * win + 0.3 * pick + 0.2 * ban).toFixed(2)
}

// Assign tier based on meta_score
export function getTierFromScore(score: number, allScores: number[]): TierLevel {
  const max = Math.max(...allScores)
  const pct = (score / max) * 100
  if (pct >= 90) return 'T0'
  if (pct >= 78) return 'T0.5'
  if (pct >= 65) return 'T1'
  if (pct >= 52) return 'T1.5'
  if (pct >= 40) return 'T2'
  if (pct >= 28) return 'T3'
  return 'T4'
}

// Tier score (T0 → T0.5 rule from mcxssg.net: normalized 0–100)
export function computeTierScore(
  winRate: number,
  banRate: number,
  pickRate: number
): number {
  // site uses ban_rate as dominant signal
  return +(banRate * 0.5 + winRate * 0.3 + pickRate * 0.2).toFixed(1)
}

export function tierColor(tier: TierLevel): string {
  const map: Record<TierLevel, string> = {
    T0: '#f97316',
    'T0.5': '#fb923c',
    T1: '#facc15',
    'T1.5': '#a3e635',
    T2: '#34d399',
    T3: '#60a5fa',
    T4: '#94a3b8',
  }
  return map[tier] ?? '#94a3b8'
}

export function tierBg(tier: TierLevel): string {
  const map: Record<TierLevel, string> = {
    T0: 'bg-orange-500',
    'T0.5': 'bg-orange-400',
    T1: 'bg-yellow-400',
    'T1.5': 'bg-lime-400',
    T2: 'bg-emerald-400',
    T3: 'bg-blue-400',
    T4: 'bg-slate-400',
  }
  return map[tier] ?? 'bg-slate-400'
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '--'
  return `${n.toFixed(1)}%`
}

export function formatDate(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
