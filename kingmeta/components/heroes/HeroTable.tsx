'use client'

import Link from 'next/link'
import TierBadge from './TierBadge'
import { formatPercent } from '@/lib/utils'
import type { HeroWithStats } from '@/types'
import type { TierLevel } from '@/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type SortKey = 'win_rate' | 'pick_rate' | 'ban_rate' | 'bp_rate' | 'meta_score'

const COLS: { key: SortKey; label: string; mobileHide?: boolean }[] = [
  { key: 'win_rate', label: '胜率' },
  { key: 'pick_rate', label: '出场率' },
  { key: 'ban_rate', label: '禁用率' },
  { key: 'bp_rate', label: 'BP率', mobileHide: true },
  { key: 'meta_score', label: '评分', mobileHide: true },
]

export default function HeroTable({ heroes }: { heroes: HeroWithStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('win_rate')
  const [asc, setAsc] = useState(false)

  const sorted = [...heroes].sort((a, b) => {
    const va = (a[sortKey] as number) ?? 0
    const vb = (b[sortKey] as number) ?? 0
    return asc ? va - vb : vb - va
  })

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(v => !v)
    else { setSortKey(k); setAsc(false) }
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] md:grid-cols-[44px_1fr_80px_80px_80px_80px_80px] items-center px-3 py-2.5 border-b border-white/[0.06] text-xs text-gray-500 gap-2">
        <span className="hidden md:block">#</span>
        <span>英雄</span>
        {COLS.map(c => (
          <button
            key={c.key}
            onClick={() => toggleSort(c.key)}
            className={cn(
              'text-right font-medium transition-colors hover:text-white',
              c.mobileHide && 'hidden md:block',
              sortKey === c.key && 'text-orange-400'
            )}>
            {c.label}{sortKey === c.key ? (asc ? ' ↑' : ' ↓') : ''}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div>
        {sorted.map((h, i) => {
          const winColor = h.win_rate
            ? h.win_rate >= 52 ? 'text-orange-400' : h.win_rate < 48 ? 'text-blue-400' : 'text-white'
            : 'text-gray-500'
          const banColor = h.ban_rate && h.ban_rate >= 50 ? 'text-red-400' : 'text-white'

          return (
            <Link key={h.hero_id}
              href={`/hero/${h.hero_id}`}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] md:grid-cols-[44px_1fr_80px_80px_80px_80px_80px] items-center px-3 py-2 md:py-2.5 gap-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0 group">
              <span className="text-xs text-gray-600 font-mono hidden md:block">{i + 1}</span>
              {/* Hero info */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={String(h.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                  alt={h.name ?? ''}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{h.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {h.tier && <TierBadge tier={h.tier as TierLevel} size="sm" />}
                    <span className="text-[10px] text-gray-600 truncate hidden sm:block">
                      {(h.roles as string[] | null)?.join('/')}
                    </span>
                  </div>
                </div>
              </div>
              {/* Stats */}
              <span className={cn('text-sm font-bold text-right', winColor)}>
                {formatPercent(h.win_rate)}
              </span>
              <span className="text-sm text-purple-400 text-right">
                {formatPercent(h.pick_rate)}
              </span>
              <span className={cn('text-sm font-medium text-right', banColor)}>
                {formatPercent(h.ban_rate)}
              </span>
              <span className="text-sm text-gray-400 text-right hidden md:block">
                {formatPercent(h.bp_rate)}
              </span>
              <span className="text-sm text-yellow-400 text-right hidden md:block">
                {h.meta_score ? h.meta_score.toFixed(1) : '--'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
