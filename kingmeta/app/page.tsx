import React from 'react'
import type { HeroWithStats, TierLevel } from '@/types'
import Link from 'next/link'
import TierBadge from '@/components/heroes/TierBadge'
import { formatPercent } from '@/lib/utils'
import { ChevronRight, ArrowRight, Flame, TrendingUp, Shield, Star } from 'lucide-react'

export const revalidate = 3600

const TIER_ORDER = ['T0', 'T0.5', 'T1', 'T2', 'T3', 'T4']
const SOURCE = 'https://pvp.mcxssg.net'
const HDR = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': SOURCE,
}

function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

interface RawStat { heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }
interface RawTier { heroId: number; heroName: string; avatarUrl: string; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }

async function getHomeData() {
  const date = getYesterday()
  try {
    const [sr, tr] = await Promise.all([
      fetch(`${SOURCE}/api/herostats?date=${date}&gameMode=1`, { headers: HDR, next: { revalidate: 3600 } }),
      fetch(`${SOURCE}/api/global/tier?date=${date}&gameMode=1`, { headers: HDR, next: { revalidate: 3600 } }),
    ])
    const stats: RawStat[] = await sr.json()
    const tierData: { tiers: RawTier[] } = await tr.json()
    const sm = new Map(stats.map(h => [h.heroId, h]))

    const heroes: HeroWithStats[] = tierData.tiers.map(t => {
      const s = sm.get(t.heroId)
      const roles = s ? s.roles.split('/').map((r: string) => r.trim()) : [t.role.split('/')[0]]
      return {
        hero_id: String(t.heroId), name: t.heroName, avatar_url: t.avatarUrl, roles,
        is_new: s?.update ?? false, win_rate: s?.winRate, pick_rate: s?.pickRate, ban_rate: s?.banRate,
        bp_rate: s ? Math.round((s.pickRate + s.banRate) * 100) / 100 : undefined,
        tier: t.tierInRole as TierLevel, tier_score: t.finalNormalizedTierScore,
        hero_power: t.trueHeroPowerInRole, high_ban: t.highBan, low_pick: t.lowPick,
        rank_in_role: t.rankInRole, role_for_tier: t.role, meta_score: t.finalNormalizedTierScore,
      }
    }).sort((a, b) => (b.tier_score ?? 0) - (a.tier_score ?? 0))

    const tierMap: Record<string, HeroWithStats[]> = {}
    for (const h of heroes) {
      const t = String(h.tier ?? 'T4')
      if (!tierMap[t]) tierMap[t] = []
      tierMap[t].push(h)
    }
    return { heroes, tierMap, date }
  } catch { return null }
}

export default async function HomePage() {
  const data = await getHomeData()
  if (!data) return (
    <div className="flex items-center justify-center min-h-[70vh] text-gray-500">
      <div className="text-center space-y-2">
        <div className="text-5xl opacity-30">⚡</div>
        <p className="text-sm">数据加载失败，请稍候重试</p>
      </div>
    </div>
  )

  const { heroes, tierMap, date } = data
  const t0 = tierMap['T0'] ?? []
  const t05 = tierMap['T0.5'] ?? []
  const topHeroes = [...t0, ...t05].slice(0, 3)
  const highBan = heroes.filter(h => h.high_ban).sort((a, b) => (b.ban_rate ?? 0) - (a.ban_rate ?? 0))
  const topWin = [...heroes].sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0)).slice(0, 6)
  const topPick = [...heroes].sort((a, b) => (b.pick_rate ?? 0) - (a.pick_rate ?? 0)).slice(0, 6)
  const topBan = [...heroes].sort((a, b) => (b.ban_rate ?? 0) - (a.ban_rate ?? 0)).slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-5 md:py-8 space-y-5 md:space-y-8">

      {/* ── HERO SECTION ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#13101f] via-[#0f0f1a] to-[#080810] p-5 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_top_right,rgba(249,115,22,0.08),transparent)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          {/* Text */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-2.5 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              巅峰千强 · {date} 数据
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-2">
              王者荣耀<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                版本情报站
              </span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base mb-5">
              实时梯度 · 英雄数据 · 出装推荐 · 战力分析
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <Link href="/heroes"
                className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40">
                英雄数据 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/tier"
                className="inline-flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-gray-200 px-4 py-2.5 rounded-xl text-sm transition-all">
                梯度榜 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Top 3 heroes */}
          {topHeroes.length > 0 && (
            <div className="flex gap-3 md:gap-4 shrink-0">
              {topHeroes.map((h, i) => (
                <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
                  className="flex flex-col items-center gap-2 group">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={String(h.avatar_url)} alt={h.name ?? ''}
                      className={`rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-orange-400/50 transition-all ${
                        i === 0 ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'
                      }`} />
                    <div className="absolute -bottom-2 -right-2">
                      <TierBadge tier={h.tier as TierLevel} size="sm" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{h.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { label: 'T0 英雄', value: t0.length, color: 'text-red-400', sub: '版本最强' },
          { label: 'T0.5 强力', value: t05.length, color: 'text-orange-400', sub: '次强英雄' },
          { label: '必Ban英雄', value: highBan.length, color: 'text-rose-400', sub: `禁率≥20%` },
          { label: '英雄总数', value: heroes.length, color: 'text-white', sub: '版本在线' },
        ].map(s => (
          <div key={s.label} className="bg-[#10101e] border border-white/[0.06] rounded-2xl p-3.5 md:p-4">
            <div className="text-xs text-gray-500 mb-1.5">{s.label}</div>
            <div className={`text-2xl md:text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-gray-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── TIER PREVIEW ── */}
      <div className="bg-[#0e0e1c] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">当前梯度总览</h2>
          </div>
          <Link href="/tier" className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium">
            完整梯度表 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="p-3 md:p-4 space-y-2.5">
          {TIER_ORDER.filter(t => tierMap[t]?.length).map(tier => (
            <div key={tier} className="flex items-center gap-3">
              <TierBadge tier={tier as TierLevel} size="sm" className="w-12 justify-center shrink-0" />
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {(tierMap[tier] ?? []).slice(0, 14).map((h: HeroWithStats) => (
                  <Link key={h.hero_id} href={`/hero/${h.hero_id}`} title={`${h.name} ${h.tier_score?.toFixed(1)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={String(h.avatar_url)}
                      alt={h.name ?? ''}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10 hover:ring-orange-400/60 hover:scale-110 transition-all"
                    />
                  </Link>
                ))}
                {(tierMap[tier] ?? []).length > 14 && (
                  <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[9px] text-gray-500">
                    +{(tierMap[tier] ?? []).length - 14}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-600 shrink-0">{(tierMap[tier] ?? []).length}名</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RANK CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 胜率榜 */}
        <RankCard title="胜率榜 TOP6" icon={<Flame className="w-4 h-4" />} color="#f97316"
          heroes={topWin} valueKey="win_rate" suffix="%" label="胜率" />
        {/* 出场率榜 */}
        <RankCard title="出场率 TOP6" icon={<TrendingUp className="w-4 h-4" />} color="#a855f7"
          heroes={topPick} valueKey="pick_rate" suffix="%" label="出场" />
        {/* 禁用率榜 */}
        <RankCard title="禁用率 TOP6" icon={<Shield className="w-4 h-4" />} color="#ef4444"
          heroes={topBan} valueKey="ban_rate" suffix="%" label="禁用" />
      </div>

      {/* ── MUST BAN SECTION ── */}
      {highBan.slice(0, 8).length > 0 && (
        <div className="bg-gradient-to-br from-red-950/30 to-transparent border border-red-500/15 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <h2 className="text-sm font-semibold text-white">必Ban警告</h2>
            <span className="text-xs text-gray-500 ml-1">高禁用率英雄</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {highBan.slice(0, 8).map(h => (
              <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
                className="flex items-center gap-2 bg-red-500/5 border border-red-500/10 hover:border-red-500/30 rounded-xl px-3 py-2 transition-all group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={String(h.avatar_url)} alt={h.name ?? ''} className="w-8 h-8 rounded-lg object-cover" />
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-red-300 transition-colors">{h.name}</div>
                  <div className="text-[10px] text-red-400 font-bold">禁 {h.ban_rate?.toFixed(1)}%</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-700 text-center pb-2">
        数据来源 pvp.mcxssg.net · 每日自动更新 · KingMeta
      </p>
    </div>
  )
}

function RankCard({ title, icon, color, heroes, valueKey, suffix, label }: {
  title: string; icon: React.ReactNode; color: string
  heroes: HeroWithStats[]; valueKey: keyof HeroWithStats; suffix: string; label: string
}) {
  return (
    <div className="bg-[#0e0e1c] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-2">
        {heroes.map((h, i) => {
          const val = h[valueKey] as number ?? 0
          const maxVal = (heroes[0][valueKey] as number) ?? 1
          return (
            <Link key={h.hero_id} href={`/hero/${h.hero_id}`}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
              <span className="text-xs text-gray-600 font-mono w-4 shrink-0">{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={String(h.avatar_url)} alt={h.name ?? ''} className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-gray-200 group-hover:text-white truncate transition-colors">{h.name}</span>
                  <span className="text-xs font-bold shrink-0 ml-2" style={{ color }}>{val.toFixed(1)}{suffix}</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(val / maxVal) * 100}%`, background: color }} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
