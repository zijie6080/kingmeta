import { supabaseAdmin } from '@/lib/supabase'
import TierBadge from '@/components/heroes/TierBadge'
import Link from 'next/link'
import { formatPercent } from '@/lib/utils'
import type { TierLevel } from '@/types'
import { Calendar } from 'lucide-react'

export const revalidate = 300

const TIER_ORDER: TierLevel[] = ['T0', 'T0.5', 'T1', 'T1.5', 'T2', 'T3', 'T4']
const TIER_DESCRIPTIONS: Record<string, string> = {
  'T0': '版本最强', 'T0.5': '强力英雄', 'T1': '强势推荐',
  'T1.5': '稳定可用', 'T2': '均衡', 'T3': '需高操作', 'T4': '版本弱势',
}
const ROLES = ['全部分路', '对抗路', '打野', '中路', '发育路', '游走']

async function getTierData() {
  const { data: latestRow } = await supabaseAdmin
    .from('hero_stats').select('stat_date')
    .eq('game_mode', '巅峰千强')
    .order('stat_date', { ascending: false }).limit(1).single()
  if (!latestRow) return { tiers: {}, date: null }
  const { data } = await supabaseAdmin
    .from('hero_stats')
    .select('*, heroes(name, avatar_url, roles, is_new)')
    .eq('stat_date', latestRow.stat_date).eq('game_mode', '巅峰千强')
    .order('meta_score', { ascending: false })
  const heroes = (data ?? []).map((row: Record<string, unknown>) => {
    const h = row.heroes as Record<string, unknown> | null
    return { ...row, heroes: undefined, name: h?.name, avatar_url: h?.avatar_url, roles: h?.roles, is_new: h?.is_new } as unknown as import('@/types').HeroWithStats
  })
  const tiers: Record<string, typeof heroes> = {}
  for (const h of heroes) {
    const tier = String(h.tier ?? 'T4')
    if (!tiers[tier]) tiers[tier] = []
    tiers[tier].push(h)
  }
  return { tiers, date: latestRow.stat_date }
}

export default async function TierPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role = '全部分路' } = await searchParams
  const { tiers, date } = await getTierData()

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-base md:text-xl font-bold text-white flex items-center gap-2">
          👑 英雄梯度榜
        </h1>
        {date && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {date} · 巅峰千强
          </p>
        )}
      </div>

      {/* Role tabs — scrollable on mobile */}
      <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-1 scrollbar-none">
        {ROLES.map(r => (
          <Link key={r} href={`/tier?role=${encodeURIComponent(r)}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              role === r
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
            }`}>
            {r}
          </Link>
        ))}
      </div>

      {/* Tier sections */}
      <div className="space-y-3 md:space-y-4">
        {TIER_ORDER.map(tier => {
          let tierHeroes = tiers[tier] ?? []
          if (role !== '全部分路') {
            tierHeroes = tierHeroes.filter((h: Record<string, unknown>) =>
              (h.roles as string[])?.some(r => r.includes(role))
            )
          }
          if (tierHeroes.length === 0) return null
          return (
            <div key={tier} className="bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 border-b border-white/[0.05]">
                <TierBadge tier={tier} size="sm" className="w-12 justify-center shrink-0" />
                <span className="text-sm text-white">{TIER_DESCRIPTIONS[tier]}</span>
                <span className="text-xs text-gray-600">({tierHeroes.length})</span>
              </div>
              {/* Grid: 4 cols mobile, 6 cols tablet, 8 cols desktop */}
              <div className="p-3 md:p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
                {tierHeroes.map((h: Record<string, unknown>) => (
                  <Link key={String(h.hero_id)} href={`/hero/${h.hero_id}`}
                    className="group flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl hover:bg-white/[0.06] transition-all active:scale-95">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={String(h.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                        alt={String(h.name ?? '')}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-orange-400/40 transition-all"
                      />
                      {Number(h.ban_rate) >= 50 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0a0a0f]" />
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 group-hover:text-white transition-colors text-center truncate w-full px-0.5">
                      {String(h.name ?? '')}
                    </span>
                    <span className={`text-[11px] font-bold ${Number(h.win_rate) >= 52 ? 'text-orange-400' : 'text-gray-600'}`}>
                      {formatPercent(h.win_rate as number)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-700 mt-6 md:mt-8">
        梯度算法：胜率×0.5 + 出场率×0.3 + 禁用率×0.2
      </p>
    </div>
  )
}
