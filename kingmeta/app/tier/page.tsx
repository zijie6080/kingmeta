import { supabaseAdmin } from '@/lib/supabase'
import TierBadge from '@/components/heroes/TierBadge'
import Link from 'next/link'
import { formatPercent } from '@/lib/utils'
import type { TierLevel } from '@/types'
import { Shield, Calendar } from 'lucide-react'

export const revalidate = 300

const TIER_ORDER: TierLevel[] = ['T0', 'T0.5', 'T1', 'T1.5', 'T2', 'T3', 'T4']
const TIER_DESCRIPTIONS: Record<string, string> = {
  'T0':   '版本最强，优先考虑',
  'T0.5': '接近T0，强力英雄',
  'T1':   '强势，值得选用',
  'T1.5': '稳定，表现良好',
  'T2':   '均衡，中规中矩',
  'T3':   '较弱，需高超操作',
  'T4':   '版本较弱，不推荐',
}

const ROLES = ['全部分路', '对抗路', '打野', '中路', '发育路', '游走']

async function getTierData(role?: string) {
  const { data: latestRow } = await supabaseAdmin
    .from('hero_stats').select('stat_date')
    .eq('game_mode', '巅峰千强')
    .order('stat_date', { ascending: false }).limit(1).single()

  if (!latestRow) return { tiers: {}, date: null }

  let query = supabaseAdmin
    .from('hero_stats')
    .select('*, heroes(name, avatar_url, roles, is_new)')
    .eq('stat_date', latestRow.stat_date)
    .eq('game_mode', '巅峰千强')
    .order('meta_score', { ascending: false })

  const { data } = await query

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
  const { tiers, date } = await getTierData(role)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            👑 英雄梯度榜
          </h1>
          {date && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {date} · 巅峰千强
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-red-500" />
            高禁用率
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-white/20 border border-white/30" />
            低出场率
          </div>
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLES.map(r => (
          <Link key={r} href={`/tier?role=${encodeURIComponent(r)}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              role === r
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-white'
            }`}>
            {r}
          </Link>
        ))}
      </div>

      {/* Tier sections */}
      <div className="space-y-4">
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
              {/* Tier header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
                <TierBadge tier={tier} size="lg" className="w-14 justify-center" />
                <div>
                  <span className="text-sm font-medium text-white">{TIER_DESCRIPTIONS[tier]}</span>
                  <span className="text-xs text-gray-600 ml-2">({tierHeroes.length} 名英雄)</span>
                </div>
              </div>

              {/* Heroes grid */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tierHeroes.map((h: Record<string, unknown>) => (
                  <Link key={String(h.hero_id)} href={`/hero/${h.hero_id}`}
                    className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/[0.06] transition-all hover:-translate-y-0.5">
                    <div className="relative">
                      <img
                        src={String(h.avatar_url ?? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                        alt={String(h.name ?? '')}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-orange-400/40 transition-all"
                      />
                      {/* High ban indicator */}
                      {Number(h.ban_rate) >= 50 && (
                        <Shield className="absolute -top-1 -right-1 w-4 h-4 text-red-400 fill-red-400/20" />
                      )}
                      {/* Low pick indicator */}
                      {Number(h.pick_rate) < 3 && (
                        <span className="absolute -bottom-1 -right-1 text-[10px] bg-white/10 border border-white/20 text-gray-400 px-1 rounded">低</span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors truncate max-w-[64px]">
                        {String(h.name ?? '')}
                      </div>
                      <div className={`text-[11px] font-bold mt-0.5 ${Number(h.win_rate) >= 52 ? 'text-orange-400' : 'text-gray-500'}`}>
                        {formatPercent(h.win_rate as number)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* T0 boundary indicator (like the original site) */}
              {tier === 'T0' && tiers['T0.5'] && (
                <div className="px-4 pb-2 text-xs text-gray-600 flex items-center gap-1">
                  ↘ 与 T0.5 临界区间
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-700 mt-8">
        梯度基于算法自动计算：禁用率×0.5 + 胜率×0.3 + 出场率×0.2
      </p>
    </div>
  )
}
