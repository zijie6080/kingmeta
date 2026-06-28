import React from 'react'
import type { HeroWithStats, TierLevel } from '@/types'
import Link from 'next/link'
import TierBadge from '@/components/heroes/TierBadge'
import { formatPercent } from '@/lib/utils'
import { Trophy, TrendingUp, Shield, Zap, ChevronRight, Calendar } from 'lucide-react'

export const revalidate = 3600

const TIER_ORDER = ['T0', 'T0.5', 'T1', 'T2', 'T3', 'T4']
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

async function getHomeData() {
  const date = getYesterday()
  try {
    const [statsRes, tierRes] = await Promise.all([
      fetch(`${BASE_URL}/api/herostats?date=${date}&gameMode=1`, { headers: HEADERS, next: { revalidate: 3600 } }),
      fetch(`${BASE_URL}/api/global/tier?date=${date}&gameMode=1`, { headers: HEADERS, next: { revalidate: 3600 } }),
    ])
    const stats: Array<{ heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }> = await statsRes.json()
    const tierData: { tiers: Array<{ heroId: number; heroName: string; avatarUrl: string; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }> } = await tierRes.json()

    const statsMap = new Map(stats.map(h => [h.heroId, h]))

    const heroes: HeroWithStats[] = tierData.tiers.map(t => {
      const s = statsMap.get(t.heroId)
      const roles = s ? (typeof s.roles === 'string' ? s.roles.split('/').map(r => r.trim()) : []) : [t.role.split('/')[0]]
      return {
        hero_id: String(t.heroId),
        name: s?.heroName ?? t.role.split("/")[0],
        avatar_url: s?.avatarUrl ?? "",
        roles,
        is_new: s?.update ?? false,
        win_rate: s?.winRate,
        pick_rate: s?.pickRate,
        ban_rate: s?.banRate,
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
    })

    // 按 tier_score 排序
    heroes.sort((a, b) => (b.tier_score ?? 0) - (a.tier_score ?? 0))

    const tierMap: Record<string, HeroWithStats[]> = {}
    for (const h of heroes) {
      const t = String(h.tier ?? 'T4')
      if (!tierMap[t]) tierMap[t] = []
      tierMap[t].push(h)
    }

    return { heroes, tierMap, date }
  } catch (e) {
    console.error('getHomeData error:', e)
    return null
  }
}

function RankCard({
  title, icon, heroes, valueKey, color,
}: {
  title: string; icon: React.ReactNode; heroes: HeroWithStats[]
  valueKey: keyof HeroWithStats; color: string
}) {
  const sorted = [...heroes].sort((a, b) => ((b[valueKey] as number) ?? 0) - ((a[valueKey] as number) ?? 0))
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-1">
        {sorted.slice(0, 8).map((h, i) => (
          <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
            className="flex items-center gap-2 group hover:bg-white/[0.04] rounded-lg px-1.5 py-1 transition-colors">
            <span className="text-xs text-gray-600 w-4 font-mono shrink-0">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={String(h.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
              alt={h.name ?? ''}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 shrink-0"
            />
            <span className="flex-1 text-sm text-gray-300 group-hover:text-white truncate">{h.name}</span>
            <span className="text-sm font-bold shrink-0" style={{ color }}>
              {((h[valueKey] as number) ?? 0).toFixed(1)}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  const homeData = await getHomeData()

  if (!homeData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-3">⚡</div>
          <p>数据加载中，请稍候…</p>
        </div>
      </div>
    )
  }

  const { heroes, tierMap, date } = homeData

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-6">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border border-orange-500/10 p-5 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent_60%)]" />
        <div className="relative">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            王者荣耀<span className="text-orange-400">数据站</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base mb-4">巅峰千强 · 实时梯度 · 完整英雄数据</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            数据日期：{date} · 来源 pvp.mcxssg.net
          </div>
          <div className="flex gap-2 mt-4">
            <Link href="/heroes" className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              英雄榜<ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/tier" className="inline-flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-gray-200 px-4 py-2 rounded-xl text-sm transition-colors">
              梯度表<ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'T0 英雄', value: tierMap['T0']?.length ?? 0, color: 'text-red-400' },
          { label: 'T0.5 强力', value: tierMap['T0.5']?.length ?? 0, color: 'text-orange-400' },
          { label: '总英雄数', value: heroes.length, color: 'text-white' },
          { label: '必Ban英雄', value: heroes.filter(h => h.high_ban).length, color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4">
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tier preview */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />当前梯度
          </h2>
          <Link href="/tier" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
            完整梯度表<ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {TIER_ORDER.filter(t => tierMap[t]?.length).slice(0, 4).map(tier => (
          <div key={tier} className="flex items-center gap-2 md:gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 md:p-3 mb-2 last:mb-0">
            <TierBadge tier={tier as TierLevel} size="sm" className="shrink-0 w-10 justify-center" />
            <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
              {(tierMap[tier] ?? []).slice(0, 12).map((h: HeroWithStats) => (
                <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
                  className="flex items-center gap-1 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(h.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                    alt={h.name ?? ''}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-orange-400/50 transition-all"
                    title={h.name ?? ''}
                  />
                </Link>
              ))}
              {(tierMap[tier] ?? []).length > 12 && (
                <span className="text-xs text-gray-600 self-center">+{(tierMap[tier] ?? []).length - 12}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rank cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RankCard title="胜率榜" icon={<Trophy className="w-4 h-4" />} heroes={heroes} valueKey="win_rate" color="#f97316" />
        <RankCard title="出场率榜" icon={<TrendingUp className="w-4 h-4" />} heroes={heroes} valueKey="pick_rate" color="#a855f7" />
        <RankCard title="禁用率榜" icon={<Shield className="w-4 h-4" />} heroes={heroes} valueKey="ban_rate" color="#ef4444" />
      </div>
    </div>
  )
}
