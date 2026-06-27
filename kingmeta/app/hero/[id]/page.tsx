import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import TierBadge from '@/components/heroes/TierBadge'
import StatTrendChart from '@/components/charts/StatTrendChart'
import { formatPercent, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Star, TrendingUp, Shield, Sword, Zap } from 'lucide-react'
import type { TierLevel } from '@/types'

export const revalidate = 300

interface Props { params: Promise<{ id: string }> }

async function getHeroData(id: string) {
  try {
    const [heroRes, statRes, trendRes] = await Promise.all([
      supabaseAdmin.from('heroes').select('*').eq('id', id).single(),
      supabaseAdmin.from('hero_stats').select('*').eq('hero_id', id)
        .eq('game_mode', '巅峰千强').order('stat_date', { ascending: false }).limit(1).single(),
      supabaseAdmin.from('hero_stats')
        .select('stat_date, win_rate, pick_rate, ban_rate, tier, meta_score, rank_no')
        .eq('hero_id', id).eq('game_mode', '巅峰千强')
        .order('stat_date', { ascending: false }).limit(14),
    ])
    if (!heroRes.data) return null
    return {
      hero: heroRes.data,
      stat: statRes.data ?? null,
      trend: (trendRes.data ?? []).reverse(),
    }
  } catch { return null }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getHeroData(id)
  if (!data) return { title: 'Hero Not Found' }
  return {
    title: `${data.hero.name} – 王者荣耀英雄数据 | KingMeta`,
    description: `${data.hero.name}（${data.hero.roles?.join('/')}）当前版本胜率${data.stat?.win_rate?.toFixed(1)}%，禁用率${data.stat?.ban_rate?.toFixed(1)}%，梯度${data.stat?.tier}。`,
  }
}

function StatBox({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

export default async function HeroDetailPage({ params }: Props) {
  const { id } = await params
  const data = await getHeroData(id)
  if (!data) notFound()

  const { hero, stat, trend } = data
  const avatarUrl = hero.avatar_url ?? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}.jpg`

  const winColor = stat?.win_rate
    ? stat.win_rate >= 52 ? 'text-orange-400' : stat.win_rate >= 48 ? 'text-white' : 'text-blue-400'
    : 'text-gray-400'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/heroes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        返回英雄列表
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.07] p-6 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.06),transparent_60%)]" />
        <div className="relative flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt={hero.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover ring-2 ring-white/10"
              onError={() => {}}
            />
            {stat?.tier && (
              <TierBadge tier={stat.tier as TierLevel} size="lg"
                className="absolute -bottom-2 -right-2 shadow-xl" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{hero.name}</h1>
              {hero.is_new && (
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">调整</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {hero.roles?.map((r: string) => (
                <span key={r} className="text-xs bg-white/[0.06] border border-white/[0.08] text-gray-400 px-2 py-0.5 rounded-full">
                  {r}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < (hero.difficulty ?? 1) ? 'text-orange-400 fill-orange-400' : 'text-gray-700'}`} />
              ))}
              <span className="text-xs text-gray-600 ml-1">操作难度</span>
            </div>
            {stat?.rank_no && (
              <div className="mt-2 text-sm text-gray-400">
                当前排名 <span className="text-orange-400 font-bold">#{stat.rank_no}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox label="胜率" value={formatPercent(stat?.win_rate)} color={winColor}
          sub={stat?.win_rate && stat.win_rate >= 52 ? '强势' : stat?.win_rate && stat.win_rate < 48 ? '弱势' : '均衡'} />
        <StatBox label="出场率" value={formatPercent(stat?.pick_rate)} color="text-purple-400"
          sub={stat?.pick_rate && stat.pick_rate >= 15 ? '热门英雄' : '出场偏少'} />
        <StatBox label="禁用率" value={formatPercent(stat?.ban_rate)} color="text-red-400"
          sub={stat?.ban_rate && stat.ban_rate >= 50 ? '必Ban级别' : stat?.ban_rate && stat.ban_rate >= 20 ? '常被禁用' : '禁用较少'} />
        <StatBox label="BP率" value={formatPercent(stat?.bp_rate)} color="text-yellow-400"
          sub="Ban+Pick总占比" />
      </div>

      {/* Secondary stats */}
      {stat && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatBox label="参团率" value={formatPercent(stat.team_rate)} />
          <StatBox label="输出占比" value={formatPercent(stat.dmg_share)} />
          <StatBox label="承伤占比" value={formatPercent(stat.tank_share)} />
          <StatBox label="拿牌率" value={formatPercent(stat.medal_rate)} />
        </div>
      )}

      {/* Trend Chart */}
      {trend.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            近期趋势（最近 {trend.length} 天）
          </h2>
          <StatTrendChart data={trend} />
        </div>
      )}

      {/* Meta score */}
      {stat?.meta_score && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />
            版本综合评分
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-orange-400">{stat.meta_score.toFixed(1)}</div>
            <div className="flex-1">
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stat.meta_score / 80) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                评分算法：胜率×0.5 + 出场率×0.3 + 禁用率×0.2
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role guide placeholder */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sword className="w-4 h-4 text-orange-400" />
            出装推荐
          </h2>
          <p className="text-xs text-gray-600">出装数据正在接入，敬请期待</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            铭文推荐
          </h2>
          <p className="text-xs text-gray-600">铭文数据正在接入，敬请期待</p>
        </div>
      </div>

      <p className="text-center text-xs text-gray-700 mt-8">
        数据来源：巅峰千强公开对局 · 仅供参考
      </p>
    </div>
  )
}
