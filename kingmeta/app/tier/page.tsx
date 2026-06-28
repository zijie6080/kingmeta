import TierBadge from '@/components/heroes/TierBadge'
import Link from 'next/link'
import { formatPercent } from '@/lib/utils'
import type { TierLevel, HeroWithStats } from '@/types'
import { Calendar } from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 3600
export const metadata: Metadata = {
  title: '英雄梯度表 | KingMeta – 王者荣耀数据',
  description: '基于巅峰千强数据的王者荣耀英雄梯度排行，T0~T4完整分层，数据来源 pvp.mcxssg.net。',
}

const TIER_ORDER: TierLevel[] = ['T0', 'T0.5', 'T1', 'T2', 'T3', 'T4']
const TIER_DESCRIPTIONS: Record<string, string> = {
  'T0': '版本最强', 'T0.5': '强力英雄', 'T1': '强势推荐',
  'T2': '均衡可用', 'T3': '需要技巧', 'T4': '版本弱势',
}

const BASE_URL = 'https://pvp.mcxssg.net'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': BASE_URL,
  'Accept': 'application/json',
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

async function getTierData() {
  const date = getYesterday()
  try {
    const [statsRes, tierRes] = await Promise.all([
      fetch(`${BASE_URL}/api/herostats?date=${date}&gameMode=1`, { headers: HEADERS, next: { revalidate: 3600 } }),
      fetch(`${BASE_URL}/api/global/tier?date=${date}&gameMode=1`, { headers: HEADERS, next: { revalidate: 3600 } }),
    ])
    const stats: Array<{ heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }> = await statsRes.json()
    const tierData: { queryDate: string; tiers: Array<{ heroId: number; heroName: string; avatarUrl: string; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }> } = await tierRes.json()

    const statsMap = new Map(stats.map(h => [h.heroId, h]))

    // 合并数据，按原站 tierInRole 分组
    const tiers: Record<string, HeroWithStats[]> = {}
    for (const t of tierData.tiers) {
      const s = statsMap.get(t.heroId)
      const roles = s ? (typeof s.roles === 'string' ? s.roles.split('/').map(r => r.trim()) : []) : [t.role.split('/')[0]]
      const hero: HeroWithStats = {
        hero_id: String(t.heroId),
        name: t.heroName,
        avatar_url: t.avatarUrl,
        roles,
        is_new: s?.update ?? false,
        win_rate: s?.winRate ?? undefined,
        pick_rate: s?.pickRate ?? undefined,
        ban_rate: s?.banRate ?? undefined,
        bp_rate: s ? Math.round((s.pickRate + s.banRate) * 100) / 100 : undefined,
        tier: t.tierInRole as TierLevel,
        tier_score: t.finalNormalizedTierScore,
        hero_power: t.trueHeroPowerInRole,
        high_ban: t.highBan,
        low_pick: t.lowPick,
        rank_in_role: t.rankInRole,
        role_for_tier: t.role,
        meta_score: t.finalNormalizedTierScore,
      }
      const tier = t.tierInRole
      if (!tiers[tier]) tiers[tier] = []
      tiers[tier].push(hero)
    }

    // 每个 tier 内按 tier_score 降序
    for (const tier of Object.keys(tiers)) {
      tiers[tier].sort((a, b) => (b.tier_score ?? 0) - (a.tier_score ?? 0))
    }

    return { tiers, date }
  } catch (e) {
    console.error('getTierData error:', e)
    return { tiers: {}, date }
  }
}

export default async function TierPage() {
  const { tiers, date } = await getTierData()

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">英雄梯度表</h1>
        {date && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />数据日期：{date} · 巅峰千强 · 来源 pvp.mcxssg.net
          </div>
        )}
      </div>

      {/* Tier groups */}
      <div className="space-y-6">
        {TIER_ORDER.filter(t => tiers[t]?.length).map(tier => (
          <div key={tier}>
            {/* Tier header */}
            <div className="flex items-center gap-3 mb-3">
              <TierBadge tier={tier} size="lg" />
              <span className="text-gray-400 text-sm">{TIER_DESCRIPTIONS[tier]}</span>
              <span className="text-gray-600 text-sm ml-auto">{tiers[tier].length} 英雄</span>
            </div>
            {/* Heroes grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {tiers[tier].map(h => (
                <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
                  className="group flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-orange-500/20 rounded-xl p-2.5 transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(h.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                    alt={h.name ?? ''}
                    className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{h.name}</span>
                      {h.high_ban && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded shrink-0">禁</span>}
                    </div>
                    <div className="text-[10px] text-gray-600 truncate">{h.role_for_tier}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-yellow-400 font-bold">{h.tier_score?.toFixed(1)}</span>
                      {h.win_rate != null && (
                        <span className={`text-[10px] ${h.win_rate >= 52 ? 'text-orange-400' : h.win_rate < 48 ? 'text-blue-400' : 'text-gray-400'}`}>
                          胜{h.win_rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
