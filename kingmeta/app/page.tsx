import React from 'react'
import type { HeroWithStats } from '@/types'
import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { HeroAvatar } from '@/components/ui/HeroAvatar'
import TierBadge from '@/components/heroes/TierBadge'
import { formatPercent, formatDate } from '@/lib/utils'
import { Trophy, TrendingUp, Shield, Zap, Calendar, ChevronRight } from 'lucide-react'

export const revalidate = 300

const TIER_ORDER = ['T0', 'T0.5', 'T1', 'T1.5', 'T2', 'T3', 'T4']

async function getHomeData() {
  try {
    // Latest date
    const { data: latestRow } = await supabaseAdmin
      .from('hero_stats')
      .select('stat_date, version')
      .eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false })
      .limit(1)
      .single()

    if (!latestRow) return null

    const date = latestRow.stat_date

    // All stats for today
    const { data: allStats } = await supabaseAdmin
      .from('hero_stats')
      .select('*, heroes(name, alias, avatar_url, roles, is_new)')
      .eq('stat_date', date)
      .eq('game_mode', '巅峰千强')
      .order('rank_no', { ascending: true })

    const heroes = (allStats ?? []).map((row: Record<string, unknown>) => {
      const h = row.heroes as Record<string, unknown> | null
      return { ...row, heroes: undefined, name: h?.name, avatar_url: h?.avatar_url, roles: h?.roles, is_new: h?.is_new } as unknown as HeroWithStats
    })

    // Latest update
    const { data: lastUpdate } = await supabaseAdmin
      .from('updates').select('updated_at').order('updated_at', { ascending: false }).limit(1).single()

    return { heroes, date, version: latestRow.version, lastUpdate: lastUpdate?.updated_at }
  } catch {
    return null
  }
}

function RankCard({
  title, icon, heroes, valueKey, color, unit = '%'
}: {
  title: string
  icon: React.ReactNode
  heroes: Record<string, unknown>[]
  valueKey: string
  color: string
  unit?: string
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {heroes.slice(0, 10).map((h: Record<string, unknown>, i: number) => (
          <Link key={String(h.hero_id)} href={`/hero/${h.hero_id}`}
            className="flex items-center gap-2.5 group hover:bg-white/[0.04] rounded-lg px-1.5 py-1 transition-colors">
            <span className="text-xs text-gray-600 w-4 font-mono shrink-0">{i + 1}</span>
            <HeroAvatar
              src={String(h.avatar_url ?? '')}
              alt={String(h.name ?? '')}
              heroId={String(h.hero_id ?? '')}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-orange-400/30 transition-all"
            />
            <span className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors truncate">{String(h.name ?? '')}</span>
            <span className="text-sm font-bold shrink-0" style={{ color }}>
              {typeof h[valueKey] === 'number' ? `${(h[valueKey] as number).toFixed(1)}${unit}` : '--'}
            </span>
          </Link>
        ))}
      </div>
      <Link href="/heroes" className="flex items-center gap-1 mt-3 text-xs text-gray-600 hover:text-orange-400 transition-colors">
        查看全部 <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

export default async function HomePage() {
  const data = await getHomeData()

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Zap className="w-12 h-12 text-orange-400 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium text-gray-400">数据库未配置</p>
          <p className="text-sm text-gray-600 mt-1">请配置 Supabase 并运行爬虫初始化数据</p>
          <Link href="/api/cron" className="mt-4 inline-block px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm">
            手动触发爬虫
          </Link>
        </div>
      </div>
    )
  }

  const { heroes, date, version, lastUpdate } = data

  // Group by tier
  const tierMap: Record<string, typeof heroes> = {}
  for (const h of heroes) {
    const tier = String(h.tier ?? 'T4')
    if (!tierMap[tier]) tierMap[tier] = []
    tierMap[tier].push(h)
  }

  // Sort for rank cards
  const byWin = [...heroes].sort((a, b) => (b.win_rate as number ?? 0) - (a.win_rate as number ?? 0))
  const byPick = [...heroes].sort((a, b) => (b.pick_rate as number ?? 0) - (a.pick_rate as number ?? 0))
  const byBan = [...heroes].sort((a, b) => (b.ban_rate as number ?? 0) - (a.ban_rate as number ?? 0))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-purple-500/5 to-transparent border border-orange-500/10 p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">
              {version ?? 'S44'} · 巅峰千强
            </span>
            {lastUpdate && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                更新于 {formatDate(lastUpdate)}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-1">
            王者荣耀<span className="text-orange-400">英雄强度</span>分析
          </h1>
          <p className="text-gray-400 text-sm">基于巅峰千强公开对局数据 · 每日自动更新</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{heroes.length}</div>
              <div className="text-xs text-gray-500">英雄</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{tierMap['T0']?.length ?? 0}</div>
              <div className="text-xs text-gray-500">T0英雄</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{date}</div>
              <div className="text-xs text-gray-500">数据日期</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Snapshot */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-orange-400">👑</span> 英雄梯度
          </h2>
          <Link href="/tier" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
            完整梯度 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {TIER_ORDER.filter(t => tierMap[t]?.length).slice(0, 4).map(tier => (
            <div key={tier} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
              <TierBadge tier={tier as never} size="lg" className="shrink-0 mt-0.5 w-12 justify-center" />
              <div className="flex flex-wrap gap-2 flex-1">
                {(tierMap[tier] ?? []).slice(0, 12).map((h: Record<string, unknown>) => (
                  <Link key={String(h.hero_id)} href={`/hero/${h.hero_id}`}
                    className="flex flex-col items-center gap-1 hover:scale-105 transition-transform group">
                    <div className="relative">
                      <img
                        src={String(h.avatar_url ?? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${h.hero_id}/${h.hero_id}.jpg`)}
                        alt={String(h.name ?? '')}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-orange-400/40 transition-all"
                      />
                      {Boolean(h.ban_rate) && Number(h.ban_rate) >= 50 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0a0a0f]" title="高禁用" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors max-w-[44px] text-center truncate">
                      {String(h.name ?? '')}
                    </span>
                  </Link>
                ))}
                {(tierMap[tier]?.length ?? 0) > 12 && (
                  <Link href="/tier" className="flex flex-col items-center justify-center gap-1 w-10">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-500">
                      +{(tierMap[tier]?.length ?? 0) - 12}
                    </div>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rank Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankCard
          title="胜率 Top 10"
          icon={<Trophy className="w-4 h-4" />}
          heroes={byWin}
          valueKey="win_rate"
          color="#f97316"
        />
        <RankCard
          title="出场率 Top 10"
          icon={<TrendingUp className="w-4 h-4" />}
          heroes={byPick}
          valueKey="pick_rate"
          color="#a78bfa"
        />
        <RankCard
          title="禁用率 Top 10"
          icon={<Shield className="w-4 h-4" />}
          heroes={byBan}
          valueKey="ban_rate"
          color="#f43f5e"
        />
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-700 mt-8">
        数据来源：pvp.mcxssg.net 公开对局数据 · 仅供参考，与腾讯游戏/天美工作室无关
      </p>
    </div>
  )
}
