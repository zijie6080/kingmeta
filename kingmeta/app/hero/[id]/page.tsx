import React from 'react'
import { notFound } from 'next/navigation'
import TierBadge from '@/components/heroes/TierBadge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Zap, TrendingUp, Shield, Sword, Clock, Users } from 'lucide-react'
import type { TierLevel } from '@/types'
import { cn } from '@/lib/utils'

export const revalidate = 3600
interface Props { params: Promise<{ id: string }> }

const SOURCE = 'https://pvp.mcxssg.net'
const HDR = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': SOURCE,
}

function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

async function sf<T>(path: string): Promise<T | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(`${SOURCE}${path}`, { headers: HDR, next: { revalidate: 3600 }, signal: ctrl.signal })
    clearTimeout(timer)
    return r.ok ? (await r.json() as T) : null
  } catch { return null }
}

interface RawStat { heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }
interface RawTier { heroId: number; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }
interface BuildItem { equipId: number; equipName: string; equipIcon: string }
interface SummonerSkill { skillId: number; skillName: string; skillIcon: string }
interface FullBuild { build: BuildItem[]; frequency: number; summonerSkill?: SummonerSkill }
interface EquipData { topFullBuilds: FullBuild[]; topOverallItems: { equipId: number; equipName: string; equipIcon: string; pickRate: number }[]; equipmentMovements?: { equipmentId: number; equipmentName: string; equipmentIcon: string; delta: number }[] }
interface BpData { overallStats: { blueSideWinRate: number; blueSidePickRate: number; blueSideBanRate: number; redSideWinRate: number; redSidePickRate: number; redSideBanRate: number; earlyPickWinRate: number; earlyPickPickRate: number; latePickWinRate: number; latePickPickRate: number }; pickOrderStats: { winRate: number; pickRate: number; slotLabel: string }[] }
interface BehaviorItem { name: string; data: string; dataHighlight: boolean }
interface BehaviorCategory { title: string; icon: string; dataCounts: BehaviorItem[] }
interface PeriodData { avgWinDurationSeconds: number; avgLossDurationSeconds: number; winRateByDuration: { winRate: number; intervalRate: number; durationRange: string }[] }
interface TrendPoint { stat_date: string; win_rate: number; pick_rate: number; ban_rate: number }

async function getPageData(id: string) {
  // Step 1: 找最新有数据的日期 + 同时拉当日 stats
  let validDate = ''
  let stats: RawStat[] | null = null
  for (let ago = 1; ago <= 4; ago++) {
    const d = daysAgoStr(ago)
    const s = await sf<RawStat[]>(`/api/herostats?date=${d}&gameMode=1`)
    if (Array.isArray(s) && s.length > 0) { validDate = d; stats = s; break }
  }
  if (!stats || !validDate) return null

  // Step 2: 并行拉主数据（不含趋势）
  const [tierData, equip, bp, behavior, period] = await Promise.all([
    sf<{ tiers: RawTier[] }>(`/api/global/tier?date=${validDate}&gameMode=1`),
    sf<EquipData>(`/api/hero/equip?heroId=${id}&date=${validDate}`),
    sf<BpData>(`/api/hero/bp?heroId=${id}&date=${validDate}`),
    sf<{ categories: BehaviorCategory[] }>(`/api/hero/behavior?heroId=${id}`),
    sf<PeriodData>(`/api/detail/specifyheroperiod?heroId=${id}`),
  ])

  const heroStat = stats.find(h => String(h.heroId) === id)
  if (!heroStat) return null
  const tierEntry = (tierData?.tiers ?? []).find(t => String(t.heroId) === id)

  // Step 3: 拉近3天趋势（用已找到的 validDate 为最新，往前3天）
  const trendDates = [daysAgoStr(1), daysAgoStr(2), daysAgoStr(3)].filter(d => d !== validDate)
  trendDates.unshift(validDate)
  const extraStats = await Promise.allSettled(
    trendDates.slice(1, 4).map(d => sf<RawStat[]>(`/api/herostats?date=${d}&gameMode=1`))
  )
  const trend: TrendPoint[] = [{ stat_date: validDate, win_rate: heroStat.winRate, pick_rate: heroStat.pickRate, ban_rate: heroStat.banRate }]
  trendDates.slice(1, 4).forEach((d, i) => {
    const r = extraStats[i]
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      const h = r.value.find(s => String(s.heroId) === id)
      if (h) trend.push({ stat_date: d, win_rate: h.winRate, pick_rate: h.pickRate, ban_rate: h.banRate })
    }
  })
  trend.sort((a, b) => a.stat_date.localeCompare(b.stat_date))

  const roles = heroStat.roles.split('/').map((r: string) => r.trim())
  return {
    hero: { id, name: heroStat.heroName, avatar_url: heroStat.avatarUrl, roles, is_new: heroStat.update },
    stat: {
      win_rate: heroStat.winRate, pick_rate: heroStat.pickRate, ban_rate: heroStat.banRate,
      tier: tierEntry?.tierInRole ?? null, tier_score: tierEntry?.finalNormalizedTierScore ?? null,
      hero_power: tierEntry?.trueHeroPowerInRole ?? null, high_ban: tierEntry?.highBan ?? false,
      low_pick: tierEntry?.lowPick ?? false, rank_in_role: tierEntry?.rankInRole ?? null,
      role_for_tier: tierEntry?.role ?? null,
    },
    trend, equip, bp, behavior: behavior?.categories ?? [], period, date: validDate,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getPageData(id)
  if (!data) return { title: '英雄未找到 | KingMeta' }
  return {
    title: `${data.hero.name} 数据 | KingMeta`,
    description: `${data.hero.name} 胜率${data.stat.win_rate?.toFixed(1)}%，梯度${data.stat.tier}，梯度分${data.stat.tier_score?.toFixed(1)}。出装推荐、BP分析、行为数据。`,
  }
}

function fmt(v?: number | null, s = '%') { return v != null ? v.toFixed(1) + s : '--' }
function fmtTime(s: number) { return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` }

function Section({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[#0e0e1c] border border-white/[0.06] rounded-2xl overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
        <span className="text-orange-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function MiniChart({ data, valueKey, color }: { data: TrendPoint[]; valueKey: keyof TrendPoint; color: string }) {
  if (data.length < 2) return null
  const vals = data.map(d => d[valueKey] as number)
  const min = Math.min(...vals); const max = Math.max(...vals); const range = max - min || 0.1
  const w = 240; const h = 52; const pad = 4
  const points = vals.map((v, i) => `${pad + (i / (vals.length - 1)) * (w - pad * 2)},${pad + ((max - v) / range) * (h - pad * 2)}`).join(' ')
  const last = vals[vals.length - 1]; const prev = vals[vals.length - 2]; const delta = last - prev
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-600">{String(data[0].stat_date).slice(5)} ~ {String(data[data.length-1].stat_date).slice(5)}</span>
        <span className={`text-xs font-bold ${delta >= 0 ? 'text-orange-400' : 'text-blue-400'}`}>{delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(2)}%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {vals.map((v, i) => {
          const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
          const y = pad + ((max - v) / range) * (h - pad * 2)
          return <circle key={i} cx={x} cy={y} r={i === vals.length-1 ? 3.5 : 2} fill={color} opacity={i === vals.length-1 ? 1 : 0.5} />
        })}
      </svg>
    </div>
  )
}

export default async function HeroDetailPage({ params }: Props) {
  const { id } = await params
  const data = await getPageData(id)
  if (!data) notFound()

  const { hero, stat, trend, equip, bp, behavior, period, date } = data
  const avatar = hero.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`
  const winColor = stat.win_rate ? (stat.win_rate >= 52 ? 'text-orange-400' : stat.win_rate >= 48 ? 'text-white' : 'text-blue-400') : 'text-gray-500'

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-8">
      <Link href="/heroes" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" />英雄列表
      </Link>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0e0e1c] mb-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_top_left,rgba(249,115,22,0.07),transparent)]" />
        <div className="relative p-4 md:p-6 flex items-start gap-4">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt={hero.name} className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-white/10" />
            {stat.tier && <div className="absolute -bottom-2.5 -right-2.5"><TierBadge tier={stat.tier as TierLevel} size="lg" /></div>}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl md:text-3xl font-bold text-white">{hero.name}</h1>
              {hero.is_new && <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full">调整</span>}
              {stat.high_ban && <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full">必Ban</span>}
              {stat.low_pick && <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full">低出场</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {hero.roles.map((r: string) => <span key={r} className="text-xs bg-white/[0.06] border border-white/[0.08] text-gray-400 px-2 py-0.5 rounded-lg">{r}</span>)}
            </div>
            {stat.role_for_tier && (
              <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <span>梯度分路：<span className="text-gray-300">{stat.role_for_tier}</span></span>
                {stat.rank_in_role && <span className="bg-orange-500/10 text-orange-400 border border-orange-500/15 px-2 py-0.5 rounded-full">第 {stat.rank_in_role} 名</span>}
              </div>
            )}
            <div className="text-[10px] text-gray-600 mt-1.5">数据日期：{date}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-white/[0.05] divide-x divide-white/[0.05]">
          {[
            { label: '胜率', value: fmt(stat.win_rate), color: winColor },
            { label: '出场率', value: fmt(stat.pick_rate), color: 'text-purple-400' },
            { label: '禁用率', value: fmt(stat.ban_rate), color: 'text-red-400' },
            { label: '梯度分', value: stat.tier_score?.toFixed(1) ?? '--', color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="px-2 py-3 text-center">
              <div className={`text-lg md:text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 梯度分 & 战力 */}
      {stat.tier_score != null && (
        <div className="bg-[#0e0e1c] border border-white/[0.06] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="text-center shrink-0">
              <div className="text-3xl font-bold text-orange-400">{stat.tier_score.toFixed(1)}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">梯度分</div>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-red-500" style={{ width: `${Math.min(100, stat.tier_score)}%` }} />
              </div>
              {stat.hero_power != null && (
                <div className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  战力值：<span className="text-yellow-400 font-medium">{stat.hero_power.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 趋势 */}
      {trend.length >= 2 && (
        <Section icon={<TrendingUp className="w-4 h-4" />} title={`近 ${trend.length} 天趋势`} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'win_rate' as keyof TrendPoint, label: '胜率', color: '#f97316' },
              { key: 'pick_rate' as keyof TrendPoint, label: '出场率', color: '#a855f7' },
              { key: 'ban_rate' as keyof TrendPoint, label: '禁用率', color: '#ef4444' },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
                <MiniChart data={trend} valueKey={key} color={color} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 推荐套装 */}
      {equip?.topFullBuilds?.length && (
        <Section icon={<Sword className="w-4 h-4" />} title="推荐套装" className="mb-4">
          <div className="space-y-4">
            {equip.topFullBuilds.slice(0, 3).map((build, bi) => (
              <div key={bi} className={cn('rounded-xl p-3 border', bi === 0 ? 'bg-orange-500/5 border-orange-500/15' : 'bg-white/[0.02] border-white/[0.05]')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {bi === 0 && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">最热套装</span>}
                    {bi === 1 && <span className="text-[10px] bg-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.08]">次热套装</span>}
                    {build.summonerSkill && (
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={build.summonerSkill.skillIcon} alt={build.summonerSkill.skillName} className="w-5 h-5 rounded-lg ring-1 ring-white/10" />
                        <span className="text-[10px] text-gray-500">{build.summonerSkill.skillName}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500">使用率 <span className="text-gray-300 font-medium">{build.frequency.toFixed(1)}%</span></span>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  {build.build.map((item, ii) => (
                    <div key={ii} className="flex flex-col items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.equipIcon} alt={item.equipName} className="w-12 h-12 rounded-xl ring-1 ring-white/10" />
                      <span className="text-[9px] text-gray-500 text-center w-12 truncate">{item.equipName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {equip.topOverallItems?.length && (
            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="text-xs text-gray-500 mb-2.5">常用装备</div>
              <div className="flex gap-2 flex-wrap">
                {equip.topOverallItems.slice(0, 8).map(item => (
                  <div key={item.equipId} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.equipIcon} alt={item.equipName} className="w-7 h-7 rounded-lg" />
                    <div>
                      <div className="text-[10px] text-gray-300">{item.equipName}</div>
                      <div className="text-[9px] text-orange-400/80">{item.pickRate.toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(equip.equipmentMovements?.length ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-3 h-3 text-green-400 shrink-0" />
              <span className="text-[11px] text-gray-500">趋势上升：</span>
              {equip.equipmentMovements!.slice(0, 3).map(m => (
                <div key={m.equipmentId} className="flex items-center gap-1 bg-green-500/5 border border-green-500/15 rounded-lg px-2 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.equipmentIcon} alt={m.equipmentName} className="w-4 h-4 rounded" />
                  <span className="text-[10px] text-green-400">{m.equipmentName} +{m.delta.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* BP */}
      {bp && (
        <Section icon={<Shield className="w-4 h-4" />} title="BP 数据" className="mb-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: '🔵 蓝方', wr: bp.overallStats.blueSideWinRate, pick: bp.overallStats.blueSidePickRate, ban: bp.overallStats.blueSideBanRate, cls: 'bg-blue-500/8 border-blue-500/15', valCls: 'text-blue-300' },
              { label: '🔴 红方', wr: bp.overallStats.redSideWinRate, pick: bp.overallStats.redSidePickRate, ban: bp.overallStats.redSideBanRate, cls: 'bg-red-500/8 border-red-500/15', valCls: 'text-red-300' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl p-3 border text-center', s.cls)}>
                <div className="text-xs text-gray-400 mb-1">{s.label}胜率</div>
                <div className={`text-2xl font-bold ${s.valCls}`}>{s.wr.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500 mt-1">出场 {s.pick.toFixed(1)}% · 禁用 {s.ban.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: '⚡ 早期BP', wr: bp.overallStats.earlyPickWinRate, pick: bp.overallStats.earlyPickPickRate },
              { label: '🎯 后期BP', wr: bp.overallStats.latePickWinRate, pick: bp.overallStats.latePickPickRate },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className="text-xl font-bold text-white">{s.wr.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-600 mt-0.5">使用率 {s.pick.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          {bp.pickOrderStats?.length > 0 && (
            <>
              <div className="text-xs text-gray-500 mb-2">各顺位胜率</div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                {bp.pickOrderStats.map((s, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-2 text-center">
                    <div className="text-[9px] text-gray-600 mb-1 truncate">{s.slotLabel}</div>
                    <div className={`text-sm font-bold ${s.winRate >= 51 ? 'text-orange-400' : s.winRate < 49 ? 'text-blue-400' : 'text-white'}`}>{s.winRate.toFixed(1)}%</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{s.pickRate.toFixed(1)}%使</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      {/* 行为 */}
      {behavior.length > 0 && (
        <Section icon={<Users className="w-4 h-4" />} title="行为数据" className="mb-4">
          <div className="space-y-5">
            {behavior.map((cat, ci) => (
              <div key={ci}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cat.icon && <img src={cat.icon} alt="" className="w-4 h-4" />}
                  <span className="text-xs text-gray-400 font-semibold">{cat.title}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {cat.dataCounts.map((d, di) => (
                    <div key={di} className={cn('rounded-xl p-2.5 border', d.dataHighlight ? 'bg-orange-500/8 border-orange-500/15' : 'bg-white/[0.02] border-white/[0.05]')}>
                      <div className="text-[10px] text-gray-500 mb-0.5">{d.name}</div>
                      <div className={`text-sm font-bold ${d.dataHighlight ? 'text-orange-400' : 'text-white'}`}>{d.data}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 时长 */}
      {period && (
        <Section icon={<Clock className="w-4 h-4" />} title="对局时长分析" className="mb-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-orange-500/8 border border-orange-500/15 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-400 mb-1">🏆 胜局均时</div>
              <div className="text-2xl font-bold text-white">{fmtTime(period.avgWinDurationSeconds)}</div>
            </div>
            <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-400 mb-1">💀 败局均时</div>
              <div className="text-2xl font-bold text-white">{fmtTime(period.avgLossDurationSeconds)}</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {period.winRateByDuration.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">{d.durationRange}</span>
                <div className="flex-1 relative">
                  <div className="h-7 bg-white/[0.04] rounded-xl overflow-hidden">
                    <div className={`h-full rounded-xl ${d.winRate >= 50 ? 'bg-orange-500/40' : 'bg-blue-500/40'}`} style={{ width: `${Math.min(100, d.winRate)}%` }} />
                  </div>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{d.intervalRate.toFixed(0)}%场</span>
                </div>
                <span className={`text-sm font-bold w-12 text-right shrink-0 ${d.winRate >= 50 ? 'text-orange-400' : 'text-blue-400'}`}>{d.winRate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
