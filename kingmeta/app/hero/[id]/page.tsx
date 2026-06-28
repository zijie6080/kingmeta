import { notFound } from 'next/navigation'
import TierBadge from '@/components/heroes/TierBadge'
import StatTrendChart from '@/components/charts/StatTrendChart'
import { formatPercent } from '@/lib/utils'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Star, TrendingUp, Shield, Sword, Zap, Clock, Users } from 'lucide-react'
import type { TierLevel } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 3600

interface Props { params: Promise<{ id: string }> }

const SOURCE_BASE = 'https://pvp.mcxssg.net'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': SOURCE_BASE,
}

async function safeGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SOURCE_BASE}${path}`, { headers: HEADERS, next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

interface EquipItem { equipId: number; equipName: string; equipIcon: string; pickRate: number; winRate: number; deltaWinRate: number }
interface EquipSlot { slot: number; topItems: EquipItem[]; baseWinRate: number }
interface BpData {
  overallStats: {
    blueSideWinRate: number; blueSidePickRate: number
    redSideWinRate: number; redSidePickRate: number
    earlyPickWinRate: number; earlyPickPickRate: number
    latePickWinRate: number; latePickPickRate: number
  }
  pickOrderStats: { winRate: number; pickRate: number; slotLabel: string }[]
}
interface BehaviorCategory { title: string; icon: string; dataCounts: { name: string; data: string; dataHighlight: boolean }[] }
interface PeriodData {
  avgWinDurationSeconds: number
  avgLossDurationSeconds: number
  winRateByDuration: { winRate: number; intervalRate: number; durationRange: string }[]
}

async function getPageData(id: string) {
  const date = getYesterday()

  const [stats, tierData, equip, bp, behavior, period, trendRes] = await Promise.all([
    safeGet<Array<{ heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }>>(
      `/api/herostats?date=${date}&gameMode=1`
    ),
    safeGet<{ tiers: Array<{ heroId: number; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }> }>(
      `/api/global/tier?date=${date}&gameMode=1`
    ),
    safeGet<{ topItemsBySlot: EquipSlot[] }>(`/api/hero/equip?heroId=${id}&date=${date}`),
    safeGet<BpData>(`/api/hero/bp?heroId=${id}&date=${date}`),
    safeGet<{ categories: BehaviorCategory[] }>(`/api/hero/behavior?heroId=${id}`),
    safeGet<PeriodData>(`/api/detail/specifyheroperiod?heroId=${id}`),
    // 趋势从 DB 拉历史数据
    supabaseAdmin.from('hero_stats')
      .select('stat_date, win_rate, pick_rate, ban_rate, tier, meta_score')
      .eq('hero_id', id).eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false }).limit(14),
  ])

  const heroStat = (stats ?? []).find(h => String(h.heroId) === id)
  const tierEntry = (tierData?.tiers ?? []).find(t => String(t.heroId) === id)

  if (!heroStat) return null

  const roles = typeof heroStat.roles === 'string'
    ? heroStat.roles.split('/').map((r: string) => r.trim())
    : [String(heroStat.roles)]

  return {
    hero: {
      id,
      name: heroStat.heroName,
      avatar_url: heroStat.avatarUrl,
      roles,
      is_new: heroStat.update,
    },
    stat: {
      win_rate: heroStat.winRate,
      pick_rate: heroStat.pickRate,
      ban_rate: heroStat.banRate,
      bp_rate: Math.round((heroStat.pickRate + heroStat.banRate) * 100) / 100,
      tier: tierEntry?.tierInRole ?? null,
      tier_score: tierEntry?.finalNormalizedTierScore ?? null,
      hero_power: tierEntry?.trueHeroPowerInRole ?? null,
      high_ban: tierEntry?.highBan ?? false,
      low_pick: tierEntry?.lowPick ?? false,
      rank_in_role: tierEntry?.rankInRole ?? null,
      role_for_tier: tierEntry?.role ?? null,
    },
    trend: (trendRes.data ?? []).reverse(),
    equip: equip?.topItemsBySlot ?? [],
    bp: bp ?? null,
    behavior: behavior?.categories ?? [],
    period: period ?? null,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getPageData(id)
  if (!data) return { title: 'Hero Not Found' }
  const { hero, stat } = data
  return {
    title: `${hero.name} – 王者荣耀英雄数据 | KingMeta`,
    description: `${hero.name} 当前版本胜率${stat.win_rate?.toFixed(1) ?? '--'}%，梯度${stat.tier ?? '--'}，梯度分${stat.tier_score?.toFixed(1) ?? '--'}。`,
  }
}

function StatBox({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 md:p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl md:text-2xl font-bold ${color ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
      <span className="text-orange-400">{icon}</span>
      {children}
    </h2>
  )
}

export default async function HeroDetailPage({ params }: Props) {
  const { id } = await params
  const data = await getPageData(id)
  if (!data) notFound()

  const { hero, stat, trend, equip, bp, behavior, period } = data
  const avatarUrl = hero.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`

  const winColor = stat.win_rate
    ? stat.win_rate >= 52 ? 'text-orange-400' : stat.win_rate >= 48 ? 'text-white' : 'text-blue-400'
    : 'text-gray-400'

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-8">
      <Link href="/heroes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" />返回英雄列表
      </Link>

      {/* ===== Hero Header ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.07] p-4 md:p-6 mb-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.06),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={hero.name} className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover ring-2 ring-white/10" />
            {stat.tier && <TierBadge tier={stat.tier as TierLevel} size="lg" className="absolute -bottom-2 -right-2 shadow-xl" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold text-white">{hero.name}</h1>
              {hero.is_new && <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">调整</span>}
              {stat.high_ban && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">必Ban</span>}
              {stat.low_pick && <span className="text-xs bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">低出场</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {(hero.roles ?? []).map((r: string) => (
                <span key={r} className="text-xs bg-white/[0.06] border border-white/[0.08] text-gray-400 px-2 py-0.5 rounded-full">{r}</span>
              ))}
            </div>
            {stat.role_for_tier && (
              <div className="text-xs text-gray-500 mt-1.5">
                梯度分路：<span className="text-gray-300">{stat.role_for_tier}</span>
                {stat.rank_in_role && <span className="ml-2 text-orange-400">分路第 {stat.rank_in_role} 名</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== 核心数据 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
        <StatBox label="胜率" value={formatPercent(stat.win_rate)} color={winColor}
          sub={stat.win_rate && stat.win_rate >= 52 ? '强势版本' : stat.win_rate && stat.win_rate < 48 ? '版本弱势' : '版本均衡'} />
        <StatBox label="出场率" value={formatPercent(stat.pick_rate)} color="text-purple-400"
          sub={stat.pick_rate && stat.pick_rate >= 15 ? '热门英雄' : '出场偏少'} />
        <StatBox label="禁用率" value={formatPercent(stat.ban_rate)} color="text-red-400"
          sub={stat.ban_rate && stat.ban_rate >= 50 ? '必Ban级别' : stat.ban_rate && stat.ban_rate >= 20 ? '高禁用率' : '禁用较少'} />
        <StatBox label="BP率" value={formatPercent(stat.bp_rate)} color="text-yellow-400" sub="Ban+Pick总占比" />
      </div>

      {/* ===== 梯度评分（原站数据）===== */}
      {stat.tier_score != null && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Zap className="w-4 h-4" />}>版本梯度评分 · 数据来源 pvp.mcxssg.net</SectionTitle>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-400">{stat.tier_score.toFixed(1)}</div>
              <div className="text-xs text-gray-600 mt-1">满分 100</div>
            </div>
            <div className="flex-1">
              <div className="h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, stat.tier_score)}%` }}
                />
              </div>
              {stat.hero_power != null && (
                <div className="text-xs text-gray-500 mt-1.5">战力分：{stat.hero_power.toFixed(0)}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 趋势图 ===== */}
      {trend.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<TrendingUp className="w-4 h-4" />}>近期趋势（{trend.length} 天）</SectionTitle>
          <StatTrendChart data={trend} />
        </div>
      )}

      {/* ===== BP 数据 ===== */}
      {bp && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Shield className="w-4 h-4" />}>BP 数据</SectionTitle>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-400 mb-1">蓝方胜率</div>
              <div className="text-xl font-bold text-blue-300">{bp.overallStats.blueSideWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-0.5">出场 {bp.overallStats.blueSidePickRate.toFixed(1)}%</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-red-400 mb-1">红方胜率</div>
              <div className="text-xl font-bold text-red-300">{bp.overallStats.redSideWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-0.5">出场 {bp.overallStats.redSidePickRate.toFixed(1)}%</div>
            </div>
          </div>
          {/* 早晚BP */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">早期BP胜率</div>
              <div className="text-lg font-bold text-white">{bp.overallStats.earlyPickWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">出场 {bp.overallStats.earlyPickPickRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">后期BP胜率</div>
              <div className="text-lg font-bold text-white">{bp.overallStats.latePickWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">出场 {bp.overallStats.latePickPickRate.toFixed(1)}%</div>
            </div>
          </div>
          {/* 顺序 */}
          {bp.pickOrderStats?.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">出手顺序胜率</div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                {bp.pickOrderStats.map((s, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-600">{s.slotLabel}</div>
                    <div className="text-sm font-bold text-white">{s.winRate.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-600">{s.pickRate.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 出装推荐 ===== */}
      {equip.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Sword className="w-4 h-4" />}>出装推荐</SectionTitle>
          <div className="space-y-4">
            {equip.map((slot, si) => (
              <div key={si}>
                <div className="text-xs text-gray-500 mb-2">装备位 {slot.slot} · 基础胜率 {slot.baseWinRate?.toFixed(1)}%</div>
                <div className="flex gap-2 flex-wrap">
                  {(slot.topItems ?? []).slice(0, 5).map((item) => (
                    <div key={item.equipId} className="flex flex-col items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-2 w-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.equipIcon} alt={item.equipName} className="w-8 h-8 rounded-lg object-cover" />
                      <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full">{item.equipName}</span>
                      <span className={`text-[10px] font-bold ${item.deltaWinRate > 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                        {item.deltaWinRate > 0 ? '+' : ''}{item.deltaWinRate?.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 行为数据 ===== */}
      {behavior.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Users className="w-4 h-4" />}>行为数据</SectionTitle>
          <div className="space-y-4">
            {behavior.map((cat, ci) => (
              <div key={ci}>
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cat.icon && <img src={cat.icon} alt="" className="w-3.5 h-3.5" />}
                  {cat.title}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(cat.dataCounts ?? []).map((d, di) => (
                    <div key={di} className={`bg-white/[0.03] border rounded-xl p-2.5 ${d.dataHighlight ? 'border-orange-500/30' : 'border-white/[0.05]'}`}>
                      <div className="text-[10px] text-gray-500">{d.name}</div>
                      <div className={`text-sm font-bold mt-0.5 ${d.dataHighlight ? 'text-orange-400' : 'text-white'}`}>{d.data}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 对局时长分析 ===== */}
      {period && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Clock className="w-4 h-4" />}>对局时长分析</SectionTitle>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-400 mb-1">平均胜局时长</div>
              <div className="text-xl font-bold text-white">{Math.floor(period.avgWinDurationSeconds / 60)}:{String(period.avgWinDurationSeconds % 60).padStart(2, '0')}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-400 mb-1">平均败局时长</div>
              <div className="text-xl font-bold text-white">{Math.floor(period.avgLossDurationSeconds / 60)}:{String(period.avgLossDurationSeconds % 60).padStart(2, '0')}</div>
            </div>
          </div>
          {period.winRateByDuration?.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">各时长段胜率</div>
              <div className="space-y-1.5">
                {period.winRateByDuration.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 shrink-0">{d.durationRange}</span>
                    <div className="flex-1 h-5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.winRate >= 50 ? 'bg-orange-500/60' : 'bg-blue-500/60'}`}
                        style={{ width: `${Math.min(100, d.winRate)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${d.winRate >= 50 ? 'text-orange-400' : 'text-blue-400'}`}>{d.winRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
