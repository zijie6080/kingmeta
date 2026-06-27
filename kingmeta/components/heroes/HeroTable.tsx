'use client'

import { useState } from 'react'
import Link from 'next/link'
import TierBadge from './TierBadge'
import { formatPercent } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { HeroWithStats, TierLevel } from '@/types'

type SortKey = 'rank_no' | 'win_rate' | 'pick_rate' | 'ban_rate' | 'bp_rate' | 'meta_score'

interface Props { heroes: HeroWithStats[] }

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-600" />
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-orange-400" />
    : <ChevronDown className="w-3 h-3 text-orange-400" />
}

export default function HeroTable({ heroes }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('rank_no')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'rank_no' ? 'asc' : 'desc') }
  }

  const sorted = [...heroes].sort((a, b) => {
    const va = ((a[sortKey] as number) ?? 0)
    const vb = ((b[sortKey] as number) ?? 0)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const th = (label: string, key: SortKey) => (
    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-300 select-none whitespace-nowrap"
      onClick={() => toggleSort(key)}>
      <div className="flex items-center gap-1">{label}<SortIcon active={sortKey === key} dir={sortDir} /></div>
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] border-b border-white/[0.06]">
          <tr>
            {th('#', 'rank_no')}
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">英雄</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">梯度</th>
            {th('胜率', 'win_rate')}
            {th('出场率', 'pick_rate')}
            {th('禁用率', 'ban_rate')}
            {th('BP率', 'bp_rate')}
            {th('评分', 'meta_score')}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sorted.map((hero, idx) => {
            const heroId = hero.hero_id
            const winRate = hero.win_rate as number | undefined
            const pickRate = hero.pick_rate as number | undefined
            const banRate = hero.ban_rate as number | undefined
            const bpRate = hero.bp_rate as number | undefined
            const metaScore = hero.meta_score as number | undefined
            return (
              <tr key={heroId} className="hover:bg-white/[0.04] transition-colors group">
                <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                  {(hero.rank_no as number | undefined) ?? idx + 1}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/hero/${heroId}`} className="flex items-center gap-2.5">
                    <img
                      src={String(hero.avatar_url ?? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${heroId}/${heroId}.jpg`)}
                      alt={hero.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-orange-400/30 transition-all"
                    />
                    <div>
                      <div className="font-medium text-white text-sm group-hover:text-orange-300 transition-colors">{hero.name}</div>
                      <div className="text-[11px] text-gray-600">
                        {Array.isArray(hero.roles) ? hero.roles.join(' / ') : String(hero.roles ?? '')}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {hero.tier
                    ? <TierBadge tier={hero.tier as TierLevel} size="sm" />
                    : <span className="text-gray-600">--</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`font-bold ${(winRate ?? 0) >= 52 ? 'text-orange-400' : (winRate ?? 0) >= 48 ? 'text-white' : 'text-blue-400'}`}>
                    {formatPercent(winRate)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`${(pickRate ?? 0) >= 15 ? 'text-purple-400' : 'text-gray-300'}`}>{formatPercent(pickRate)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`${(banRate ?? 0) >= 50 ? 'text-red-400' : (banRate ?? 0) >= 20 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {formatPercent(banRate)}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-400">{formatPercent(bpRate)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
                        style={{ width: `${Math.min(100, ((metaScore ?? 0) / 60) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{metaScore?.toFixed(1) ?? '--'}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
