import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import TierBadge from '@/components/heroes/TierBadge'
import StatTrendChart from '@/components/charts/StatTrendChart'
import { formatPercent } from '@/lib/utils'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Star, TrendingUp, Shield, Sword, Zap, Clock, Users } from 'lucide-react'
import type { TierLevel } from '@/types'

export const revalidate = 300

interface Props { params: Promise<{ id: string }> }

const SOURCE_BASE = 'https://pvp.mcxssg.net'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': SOURCE_BASE,
}

async function apiGet<T>(path: string): Promise<T | null> {
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

async function getHeroData(id: string) {
  try {
    const [heroRes, statRes, trendRes] = await Promise.all([
      supabaseAdmin.from('heroes').select('*').eq('id', id).single(),
      supabaseAdmin.from('hero_stats').select('*')
        .eq('hero_id', id).eq('game_mode', '巅峰千强')
        .order('stat_date', { ascending: false }).limit(1).single(),
      supabaseAdmin.from('hero_stats')
        .select('stat_date, win_rate, pick_rate, ban_rate, tier, meta_score')
        .eq('hero_id', id).eq('game_mode', '巅峰千强')
        .order('stat_date', { ascending: false }).limit(14),
    ])
    if (!heroRes.data) return null

    // 从数据源实时拉取详情数据
    const date = getYesterday()
    const [equip, bp, behavior, period] = await Promise.all([
      apiGet<{ topItemsBySlot: EquipSlot[] }>(`/api/hero/equip?heroId=${id}&date=${date}`),
      apiGet<BpData>(`/api/hero/bp?heroId=${id}&date=${date}`),
      apiGet<{ categories: BehaviorCategory[] }>(`/api/hero/behavior?heroId=${id}`),
      apiGet<PeriodData>(`/api/detail/specifyheroperiod?heroId=${id}`),
    ])

    return {
      hero: heroRes.data,
      stat: statRes.data ?? null,
      trend: (trendRes.data ?? []).reverse(),
      equip: equip?.topItemsBySlot ?? [],
      bp: bp ?? null,
      behavior: behavior?.categories ?? [],
      period: period ?? null,
    }
  } catch { return null }
}

// Types for API responses
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
interface PeriodData { avgWinDurationSeconds: number; avgLossDurationSeconds: number; winRateByDuration: { winRate: number; intervalRate: number; durationRange: string }[] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getHeroData(id)
  if (!data) return { title: 'Hero Not Found' }
  return {
    title: `${data.hero.name} – 王者荣耀英雄数据 | KingMeta`,
    description: `${data.hero.name} 当前版本胜率${data.stat?.win_rate?.toFixed(1) ?? '--'}%，梯度${data.stat?.tier ?? '--'}。`,
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
  const data = await getHeroData(id)
  if (!data) notFound()

  const { hero, stat, trend, equip, bp, behavior, period } = data
  const avatarUrl = hero.avatar_url || `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`

  const winColor = stat?.win_rate
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
            {stat?.tier && <TierBadge tier={stat.tier as TierLevel} size="lg" className="absolute -bottom-2 -right-2 shadow-xl" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold text-white">{hero.name}</h1>
              {hero.is_new && <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">调整</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {(hero.roles ?? []).map((r: string) => (
                <span key={r} className="text-xs bg-white/[0.06] border border-white/[0.08] text-gray-400 px-2 py-0.5 rounded-full">{r}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < (hero.difficulty ?? 1) ? 'text-orange-400 fill-orange-400' : 'text-gray-700'}`} />
              ))}
              <span className="text-xs text-gray-600 ml-1">操作难度</span>
            </div>
            {stat?.rank_no && <div className="mt-1.5 text-sm text-gray-400">排名 <span className="text-orange-400 font-bold">#{stat.rank_no}</span></div>}
          </div>
        </div>
      </div>

      {/* ===== 核心数据 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
        <StatBox label="胜率" value={formatPercent(stat?.win_rate)} color={winColor} sub={stat?.win_rate && stat.win_rate >= 52 ? '强势版本' : stat?.win_rate && stat.win_rate < 48 ? '版本弱势' : '版本均衡'} />
        <StatBox label="出场率" value={formatPercent(stat?.pick_rate)} color="text-purple-400" sub={stat?.pick_rate && stat.pick_rate >= 15 ? '热门英雄' : '出场偏少'} />
        <StatBox label="禁用率" value={formatPercent(stat?.ban_rate)} color="text-red-400" sub={stat?.ban_rate && stat.ban_rate >= 50 ? '必Ban级别' : '禁用较少'} />
        <StatBox label="BP率" value={formatPercent(stat?.bp_rate)} color="text-yellow-400" sub="Ban+Pick总占比" />
      </div>

      {/* ===== 版本评分 ===== */}
      {stat?.meta_score != null && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Zap className="w-4 h-4" />}>版本综合评分</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl font-bold text-orange-400">{stat.meta_score.toFixed(1)}</div>
            <div className="flex-1">
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full" style={{ width: `${Math.min(100, (stat.meta_score / 80) * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-600 mt-1.5">胜率×0.5 + 出场率×0.3 + 禁用率×0.2</p>
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
          {/* 蓝红方 */}
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
          {/* 顺序胜率 */}
          <div className="text-xs text-gray-500 mb-2">各楼顺序胜率</div>
          <div className="space-y-1.5">
            {bp.pickOrderStats.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-xs text-gray-500 w-20 shrink-0">{s.slotLabel}</span>
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${Math.min(100, s.winRate)}%` }} />
                </div>
                <span className="text-xs text-white font-medium w-12 text-right">{s.winRate.toFixed(1)}%</span>
                <span className="text-xs text-gray-600 w-12 text-right">{s.pickRate.toFixed(1)}%场</span>
              </div>
            ))}
          </div>
          {/* 先手/后手 */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
              <div className="text-xs text-gray-500">先手胜率</div>
              <div className="text-base font-bold text-white">{bp.overallStats.earlyPickWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">{bp.overallStats.earlyPickPickRate.toFixed(1)}% 场次</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
              <div className="text-xs text-gray-500">后手胜率</div>
              <div className="text-base font-bold text-white">{bp.overallStats.latePickWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">{bp.overallStats.latePickPickRate.toFixed(1)}% 场次</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 出装推荐 ===== */}
      {equip.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Sword className="w-4 h-4" />}>出装推荐（巅峰千强）</SectionTitle>
          <div className="space-y-3">
            {equip.slice(0, 6).map((slot) => (
              <div key={slot.slot}>
                <div className="text-xs text-gray-600 mb-1.5">第 {slot.slot} 件 · 基础胜率 {slot.baseWinRate.toFixed(1)}%</div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {slot.topItems.slice(0, 4).map((item, i) => (
                    <div key={item.equipId} className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all ${i === 0 ? 'bg-orange-500/10 border-orange-500/25' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.equipIcon} alt={item.equipName} className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <div className="text-xs text-white font-medium whitespace-nowrap">{item.equipName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500">出场 {item.pickRate.toFixed(0)}%</span>
                          <span className={`text-[10px] font-medium ${item.deltaWinRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {item.deltaWinRate >= 0 ? '+' : ''}{item.deltaWinRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
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
          <SectionTitle icon={<Users className="w-4 h-4" />}>英雄行为数据</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {behavior.slice(0, 4).map((cat) => (
              <div key={cat.title}>
                <div className="flex items-center gap-2 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.icon} alt={cat.title} className="w-4 h-4" />
                  <span className="text-xs font-medium text-gray-300">{cat.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {cat.dataCounts.slice(0, 6).map((item) => (
                    <div key={item.name} className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                      <div className="text-[10px] text-gray-500">{item.name}</div>
                      <div className={`text-sm font-bold ${item.dataHighlight ? 'text-orange-400' : 'text-white'}`}>{item.data}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 对局时长 ===== */}
      {period && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-5 mb-4">
          <SectionTitle icon={<Clock className="w-4 h-4" />}>对局时长分析</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-emerald-400 mb-1">胜利场均时长</div>
              <div className="text-xl font-bold text-emerald-300">{Math.floor(period.avgWinDurationSeconds / 60)}:{String(Math.round(period.avgWinDurationSeconds % 60)).padStart(2, '0')}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-red-400 mb-1">失败场均时长</div>
              <div className="text-xl font-bold text-red-300">{Math.floor(period.avgLossDurationSeconds / 60)}:{String(Math.round(period.avgLossDurationSeconds % 60)).padStart(2, '0')}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {period.winRateByDuration.map((row) => (
              <div key={row.durationRange} className="flex items-center gap-2.5">
                <span className="text-xs text-gray-500 w-20 shrink-0">{row.durationRange}</span>
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${row.winRate}%` }} />
                </div>
                <span className="text-xs text-white font-medium w-14 text-right">胜{row.winRate.toFixed(1)}%</span>
                <span className="text-xs text-gray-600 w-14 text-right">{row.intervalRate.toFixed(1)}%场次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-700 mt-6">
        数据来源：pvp.mcxssg.net · 巅峰千强 · 仅供参考
      </p>
    </div>
  )
}
