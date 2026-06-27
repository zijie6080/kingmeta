'use client'

import Link from 'next/link'
import TierBadge from './TierBadge'
import { formatPercent } from '@/lib/utils'
import type { HeroWithStats } from '@/types'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  hero: HeroWithStats
  rank?: number
  showDelta?: boolean
  deltaWin?: number
}

export default function HeroCard({ hero, rank, deltaWin }: Props) {
  return (
    <Link href={`/hero/${hero.hero_id ?? hero.id}`}
      className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-orange-500/20 transition-all duration-200 hover:-translate-y-0.5">
      
      {rank && (
        <span className="text-xs font-bold text-gray-600 w-5 shrink-0 text-center">#{rank}</span>
      )}

      <div className="relative shrink-0">
        <img
          src={hero.avatar_url ?? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${hero.hero_id ?? hero.id}/${hero.hero_id ?? hero.id}.jpg`}
          alt={hero.name}
          className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-orange-400/40 transition-all"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-hero.png' }}
        />
        {hero.tier && (
          <TierBadge tier={hero.tier} size="sm" className="absolute -bottom-1 -right-1 shadow-md" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">{hero.name}</span>
          {hero.is_new && (
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 rounded">新</span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 truncate">
          {Array.isArray(hero.roles) ? hero.roles.join(' / ') : hero.roles}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-1">
          <span className={`text-sm font-bold ${(hero.win_rate ?? 0) >= 52 ? 'text-orange-400' : (hero.win_rate ?? 0) >= 48 ? 'text-white' : 'text-blue-400'}`}>
            {formatPercent(hero.win_rate)}
          </span>
          {deltaWin !== undefined && deltaWin !== 0 && (
            deltaWin > 0
              ? <TrendingUp className="w-3 h-3 text-emerald-400" />
              : <TrendingDown className="w-3 h-3 text-red-400" />
          )}
        </div>
        <div className="text-[11px] text-gray-600">胜率</div>
      </div>
    </Link>
  )
}
