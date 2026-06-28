'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import TierBadge from '@/components/heroes/TierBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { HeroWithStats, TierLevel } from '@/types'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, Search, ArrowUpDown } from 'lucide-react'

const ROLES = ['全部', '对抗路', '打野', '中路', '发育路', '游走']
const ROLE_ICONS: Record<string, string> = {
  '全部': '全', '对抗路': '战', '打野': '野', '中路': '法', '发育路': '射', '游走': '辅'
}

type SortKey = 'tier_score' | 'win_rate' | 'pick_rate' | 'ban_rate' | 'hero_power'
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'tier_score', label: '梯度分' },
  { key: 'win_rate', label: '胜率' },
  { key: 'pick_rate', label: '出场率' },
  { key: 'ban_rate', label: '禁用率' },
  { key: 'hero_power', label: '战力' },
]

function formatPercent(v?: number | null) {
  if (v == null) return '--'
  return v.toFixed(1) + '%'
}

export default function HeroesPage() {
  const [all, setAll] = useState<HeroWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('全部')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('tier_score')
  const [asc, setAsc] = useState(false)
  const [date, setDate] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/heroes?limit=200')
      const json = await res.json()
      setAll(json.data ?? [])
      setDate(json.meta?.date ?? '')
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = all
    .filter(h => role === '全部' || (h.roles as string[])?.some(r => r.includes(role)))
    .filter(h => !search.trim() || h.name?.includes(search.trim()))
    .sort((a, b) => {
      const va = (a[sortKey] as number) ?? 0
      const vb = (b[sortKey] as number) ?? 0
      return asc ? va - vb : vb - va
    })

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(p => !p)
    else { setSortKey(k); setAsc(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-5 md:py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">英雄数据</h1>
          <p className="text-xs text-gray-500 mt-1">巅峰千强 · {date || '加载中…'}</p>
        </div>
        <div className="text-xs text-gray-500 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-xl">
          {loading ? '…' : filtered.length} 名英雄
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索英雄名称…"
            className="w-full bg-[#0e0e1c] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">✕</button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                role === r
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                  : 'bg-[#0e0e1c] text-gray-400 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
              )}>
              <span className="w-4 h-4 flex items-center justify-center bg-white/[0.06] rounded text-[9px] font-bold">
                {ROLE_ICONS[r]}
              </span>
              {r}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-600" />
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => toggleSort(opt.key)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all border',
                sortKey === opt.key
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/20'
                  : 'bg-transparent text-gray-500 border-transparent hover:text-white'
              )}>
              {opt.label}
              {sortKey === opt.key && <ArrowUpDown className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3 opacity-30">🔍</div>
          <p>没有找到匹配的英雄</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((h, i) => {
            const winColor = h.win_rate
              ? h.win_rate >= 52 ? 'text-orange-400' : h.win_rate < 48 ? 'text-blue-400' : 'text-white'
              : 'text-gray-500'
            const banHigh = (h.ban_rate ?? 0) >= 20
            return (
              <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
                className="flex items-center gap-3 bg-[#0c0c18] hover:bg-[#10101e] border border-white/[0.05] hover:border-orange-500/15 rounded-2xl px-3 py-2.5 transition-all group">
                {/* Rank */}
                <span className="text-xs text-gray-600 font-mono w-5 shrink-0 text-center">{i + 1}</span>

                {/* Avatar */}
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={String(h.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                    alt={h.name ?? ''}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" />
                  {h.is_new && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full ring-2 ring-[#0c0c18]" />
                  )}
                </div>

                {/* Name + tier */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{h.name}</span>
                    {h.high_ban && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">必Ban</span>}
                    {h.low_pick && <span className="text-[9px] bg-sky-500/15 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-full">低出场</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {h.tier && <TierBadge tier={h.tier as TierLevel} size="sm" />}
                    <span className="text-[10px] text-gray-600">
                      {(h.roles as string[])?.join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 md:gap-5 shrink-0">
                  {/* Win rate */}
                  <div className="text-center hidden sm:block">
                    <div className={`text-sm font-bold ${winColor}`}>{formatPercent(h.win_rate)}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">胜率</div>
                  </div>
                  {/* Pick rate */}
                  <div className="text-center hidden md:block">
                    <div className="text-sm font-bold text-purple-400">{formatPercent(h.pick_rate)}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">出场</div>
                  </div>
                  {/* Ban rate */}
                  <div className="text-center hidden sm:block">
                    <div className={`text-sm font-bold ${banHigh ? 'text-red-400' : 'text-gray-300'}`}>{formatPercent(h.ban_rate)}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">禁用</div>
                  </div>
                  {/* Tier score */}
                  <div className="text-center">
                    <div className="text-sm font-bold text-yellow-400">
                      {h.tier_score != null ? (h.tier_score as number).toFixed(1) : '--'}
                    </div>
                    <div className="text-[9px] text-gray-600 mt-0.5">梯度分</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-700 text-center mt-6">
        来源 pvp.mcxssg.net · 梯度分 = 原站 finalNormalizedTierScore
      </p>
    </div>
  )
}
