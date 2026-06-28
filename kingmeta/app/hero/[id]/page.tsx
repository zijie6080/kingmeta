import { notFound } from 'next/navigation'
import TierBadge from '@/components/heroes/TierBadge'
import StatTrendChart from '@/components/charts/StatTrendChart'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Zap, TrendingUp, Shield, Sword, Clock, Users, BarChart2 } from 'lucide-react'
import type { TierLevel } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export const revalidate = 3600
interface Props { params: Promise<{ id: string }> }

const SOURCE = 'https://pvp.mcxssg.net'
const HDR = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': SOURCE,
}

async function getValidDate() {
  const { getLatestDate } = await import('@/lib/source')
  return getLatestDate()
}

function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

async function sf<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${SOURCE}${path}`, { headers: HDR, next: { revalidate: 3600 } })
    return r.ok ? (await r.json() as T) : null
  } catch { return null }
}

interface EquipItem { equipId: number; equipName: string; equipIcon: string; pickRate: number; winRate: number | null; deltaWinRate: number | null }
interface EquipSlot { slot: number; topItems: EquipItem[]; baseWinRate: number }
interface BuildItem { equipId: number; equipName: string; equipIcon: string }
interface SummonerSkill { skillId: number; skillName: string; skillIcon: string }
interface FullBuild { build: BuildItem[]; frequency: number; summonerSkill?: SummonerSkill }
interface EquipData { topItemsBySlot: EquipSlot[]; topFullBuilds: FullBuild[]; topOverallItems: { equipId: number; equipName: string; equipIcon: string; pickRate: number }[]; equipmentMovements?: { equipmentId: number; equipmentName: string; equipmentIcon: string; delta: number }[] }

interface BpData {
  overallStats: {
    blueSideWinRate: number; blueSidePickRate: number; blueSideBanRate: number
    redSideWinRate: number; redSidePickRate: number; redSideBanRate: number
    earlyPickWinRate: number; earlyPickPickRate: number
    latePickWinRate: number; latePickPickRate: number
  }
  pickOrderStats: { winRate: number; pickRate: number; slotLabel: string }[]
}

interface BehaviorItem { name: string; data: string; dataHighlight: boolean; dataNote?: string | null }
interface BehaviorCategory { title: string; icon: string; dataCounts: BehaviorItem[] }
interface PeriodData {
  avgWinDurationSeconds: number; avgLossDurationSeconds: number
  winRateByDuration: { winRate: number; intervalRate: number; durationRange: string }[]
}

async function getPageData(id: string) {
  const date = await getValidDate()
  const [stats, tierData, equip, bp, behavior, period, trendRes] = await Promise.all([
    sf<Array<{ heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }>>(
      `/api/herostats?date=${date}&gameMode=1`
    ),
    sf<{ tiers: Array<{ heroId: number; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }> }>(
      `/api/global/tier?date=${date}&gameMode=1`
    ),
    sf<EquipData>(`/api/hero/equip?heroId=${id}&date=${date}`),
    sf<BpData>(`/api/hero/bp?heroId=${id}&date=${date}`),
    sf<{ categories: BehaviorCategory[] }>(`/api/hero/behavior?heroId=${id}`),
    sf<PeriodData>(`/api/detail/specifyheroperiod?heroId=${id}`),
    supabaseAdmin.from('hero_stats')
      .select('stat_date, win_rate, pick_rate, ban_rate, tier, meta_score')
      .eq('hero_id', id).eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false }).limit(14),
  ])

  const heroStat = (stats ?? []).find(h => String(h.heroId) === id)
  const tierEntry = (tierData?.tiers ?? []).find(t => String(t.heroId) === id)
  if (!heroStat) return null

  const roles = heroStat.roles.split('/').map((r: string) => r.trim())
  return {
    hero: { id, name: heroStat.heroName, avatar_url: heroStat.avatarUrl, roles, is_new: heroStat.update },
    stat: {
      win_rate: heroStat.winRate, pick_rate: heroStat.pickRate, ban_rate: heroStat.banRate,
      bp_rate: Math.round((heroStat.pickRate + heroStat.banRate) * 100) / 100,
      tier: tierEntry?.tierInRole ?? null, tier_score: tierEntry?.finalNormalizedTierScore ?? null,
      hero_power: tierEntry?.trueHeroPowerInRole ?? null, high_ban: tierEntry?.highBan ?? false,
      low_pick: tierEntry?.lowPick ?? false, rank_in_role: tierEntry?.rankInRole ?? null,
      role_for_tier: tierEntry?.role ?? null,
    },
    trend: (trendRes.data ?? []).reverse(),
    equip, bp, behavior: behavior?.categories ?? [], period,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getPageData(id)
  if (!data) return { title: '英雄未找到 | KingMeta' }
  return {
    title: `${data.hero.name} 数据 | KingMeta`,
    description: `${data.hero.name} 胜率${data.stat.win_rate?.toFixed(1)}%，梯度${data.stat.tier}，梯度分${data.stat.tier_score?.toFixed(1)}。出装推荐、BP数据、行为分析。`,
  }
}

function fmt(v?: number | null, s = '%') {
  return v != null ? v.toFixed(1) + s : '--'
}
function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

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

export default async function HeroDetailPage({ params }: Props) {
  const { id } = await params
  const data = await getPageData(id)
  if (!data) notFound()

  const { hero, stat, trend, equip, bp, behavior, period } = data
  const avatar = hero.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`

  const winColor = stat.win_rate
    ? stat.win_rate >= 52 ? 'text-orange-400' : stat.win_rate >= 48 ? 'text-white' : 'text-blue-400'
    : 'text-gray-500'

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-8">
      <Link href="/heroes" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" />英雄列表
      </Link>

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0e0e1c] mb-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_top_left,rgba(249,115,22,0.07),transparent)]" />
        <div className="relative p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt={hero.name}
                className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-white/10" />
              {stat.tier && (
                <div className="absolute -bottom-2.5 -right-2.5">
                  <TierBadge tier={stat.tier as TierLevel} size="lg" className="shadow-xl" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl md:text-3xl font-bold text-white">{hero.name}</h1>
                {hero.is_new && <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full">调整</span>}
                {stat.high_ban && <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full">必Ban</span>}
                {stat.low_pick && <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full">低出场</span>}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {hero.roles.map((r: string) => (
                  <span key={r} className="text-xs bg-white/[0.06] border border-white/[0.08] text-gray-400 px-2 py-0.5 rounded-lg">{r}</span>
                ))}
              </div>

              {stat.role_for_tier && (
                <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                  <span>梯度分路：<span className="text-gray-300">{stat.role_for_tier}</span></span>
                  {stat.rank_in_role && (
                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/15 px-2 py-0.5 rounded-full">
                      分路第 {stat.rank_in_role} 名
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 border-t border-white/[0.05] divide-x divide-white/[0.05]">
          {[
            { label: '胜率', value: fmt(stat.win_rate), color: winColor },
            { label: '出场率', value: fmt(stat.pick_rate), color: 'text-purple-400' },
            { label: '禁用率', value: fmt(stat.ban_rate), color: 'text-red-400' },
            { label: '梯度分', value: stat.tier_score?.toFixed(1) ?? '--', color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="px-3 py-3 text-center">
              <div className={`text-lg md:text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCORE BAR ── */}
      {stat.tier_score != null && (
        <div className="bg-[#0e0e1c] border border-white/[0.06] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="text-center shrink-0">
              <div className="text-3xl font-bold text-orange-400">{stat.tier_score.toFixed(1)}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">梯度分</div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                <span>0</span>
                <span className="text-orange-400/60">100（满分）</span>
              </div>
              <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all"
                  style={{ width: `${Math.min(100, stat.tier_score)}%` }} />
              </div>
              {stat.hero_power != null && (
                <div className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  战力值：<span className="text-yellow-400 font-medium">{stat.hero_power.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BUILDS (套装推荐) ── */}
      {equip?.topFullBuilds?.length && (
        <Section icon={<Sword className="w-4 h-4" />} title="推荐套装" className="mb-4">
          <div className="space-y-4">
            {equip.topFullBuilds.slice(0, 3).map((build, bi) => (
              <div key={bi} className={cn('rounded-xl p-3 border', bi === 0 ? 'bg-orange-500/5 border-orange-500/15' : 'bg-white/[0.02] border-white/[0.05]')}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    {bi === 0 && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">最热套装</span>}
                    {build.summonerSkill && (
                      <div className="flex items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={build.summonerSkill.skillIcon} alt={build.summonerSkill.skillName}
                          className="w-5 h-5 rounded-lg" />
                        <span className="text-[10px] text-gray-500">{build.summonerSkill.skillName}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500">使用率 {build.frequency.toFixed(1)}%</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {build.build.map((item, ii) => (
                    <div key={ii} className="flex flex-col items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.equipIcon} alt={item.equipName}
                        className="w-11 h-11 rounded-xl ring-1 ring-white/10" />
                      <span className="text-[9px] text-gray-500 text-center w-11 truncate leading-tight">{item.equipName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 常用装备 */}
          {equip.topOverallItems?.length && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">常用装备（出场率）</div>
              <div className="flex gap-2 flex-wrap">
                {equip.topOverallItems.slice(0, 8).map(item => (
                  <div key={item.equipId} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.equipIcon} alt={item.equipName} className="w-7 h-7 rounded-lg" />
                    <div>
                      <div className="text-[10px] text-gray-300 leading-tight">{item.equipName}</div>
                      <div className="text-[9px] text-gray-500">{item.pickRate.toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 装备变化趋势 */}
          {equip.equipmentMovements?.length && (
            <div className="mt-3 flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-[11px] text-gray-500">热门装备上升：</span>
              {equip.equipmentMovements.slice(0, 2).map(m => (
                <div key={m.equipmentId} className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.equipmentIcon} alt={m.equipmentName} className="w-4 h-4 rounded" />
                  <span className="text-[10px] text-green-400">{m.equipmentName} +{m.delta.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── TREND ── */}
      {trend.length > 0 && (
        <Section icon={<TrendingUp className="w-4 h-4" />} title={`近期趋势（${trend.length} 天）`} className="mb-4">
          <StatTrendChart data={trend} />
        </Section>
      )}

      {/* ── BP DATA ── */}
      {bp && (
        <Section icon={<Shield className="w-4 h-4" />} title="BP 数据分析" className="mb-4">
          {/* 蓝红方 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: '蓝方胜率', wr: bp.overallStats.blueSideWinRate, pick: bp.overallStats.blueSidePickRate, ban: bp.overallStats.blueSideBanRate, color: 'blue' },
              { label: '红方胜率', wr: bp.overallStats.redSideWinRate, pick: bp.overallStats.redSidePickRate, ban: bp.overallStats.redSideBanRate, color: 'red' },
            ].map(s => (
              <div key={s.label} className={cn(
                'rounded-xl p-3 border text-center',
                s.color === 'blue' ? 'bg-blue-500/8 border-blue-500/15' : 'bg-red-500/8 border-red-500/15'
              )}>
                <div className={`text-xs mb-1 ${s.color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>{s.label}</div>
                <div className={`text-2xl font-bold ${s.color === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>{s.wr.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500 mt-1">出场 {s.pick.toFixed(1)}% · 禁用 {s.ban.toFixed(1)}%</div>
              </div>
            ))}
          </div>

          {/* 早晚 BP */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: '早期BP', wr: bp.overallStats.earlyPickWinRate, pick: bp.overallStats.earlyPickPickRate },
              { label: '后期BP', wr: bp.overallStats.latePickWinRate, pick: bp.overallStats.latePickPickRate },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className="text-xl font-bold text-white">{s.wr.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-600 mt-0.5">使用率 {s.pick.toFixed(1)}%</div>
              </div>
            ))}
          </div>

          {/* 出手顺序 */}
          {bp.pickOrderStats?.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">各顺位胜率</div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                {bp.pickOrderStats.map((s, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-2 text-center">
                    <div className="text-[9px] text-gray-600 mb-1">{s.slotLabel}</div>
                    <div className={`text-sm font-bold ${s.winRate >= 51 ? 'text-orange-400' : s.winRate < 49 ? 'text-blue-400' : 'text-white'}`}>
                      {s.winRate.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{s.pickRate.toFixed(1)}%使用</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── BEHAVIOR ── */}
      {behavior.length > 0 && (
        <Section icon={<Users className="w-4 h-4" />} title="行为数据" className="mb-4">
          <div className="space-y-5">
            {behavior.map((cat, ci) => (
              <div key={ci}>
                <div className="flex items-center gap-1.5 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cat.icon && <img src={cat.icon} alt="" className="w-4 h-4" />}
                  <span className="text-xs text-gray-400 font-medium">{cat.title}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {cat.dataCounts.map((d, di) => (
                    <div key={di} className={cn(
                      'rounded-xl p-2.5 border',
                      d.dataHighlight
                        ? 'bg-orange-500/8 border-orange-500/15'
                        : 'bg-white/[0.02] border-white/[0.05]'
                    )}>
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

      {/* ── PERIOD ── */}
      {period && (
        <Section icon={<Clock className="w-4 h-4" />} title="对局时长分析" className="mb-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-orange-500/8 border border-orange-500/15 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-400 mb-1">胜局均时</div>
              <div className="text-2xl font-bold text-white">{fmtTime(period.avgWinDurationSeconds)}</div>
            </div>
            <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-400 mb-1">败局均时</div>
              <div className="text-2xl font-bold text-white">{fmtTime(period.avgLossDurationSeconds)}</div>
            </div>
          </div>
          <div className="space-y-2">
            {period.winRateByDuration.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">{d.durationRange}</span>
                <div className="flex-1 h-6 bg-white/[0.04] rounded-xl overflow-hidden relative">
                  <div
                    className={`h-full rounded-xl transition-all ${d.winRate >= 50 ? 'bg-orange-500/50' : 'bg-blue-500/50'}`}
                    style={{ width: `${Math.min(100, d.winRate)}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{d.intervalRate.toFixed(0)}%场次</span>
                </div>
                <span className={`text-sm font-bold w-12 text-right ${d.winRate >= 50 ? 'text-orange-400' : 'text-blue-400'}`}>
                  {d.winRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}
