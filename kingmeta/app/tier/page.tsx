import TierBadge from '@/components/heroes/TierBadge'
import Link from 'next/link'
import type { TierLevel, HeroWithStats } from '@/types'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'

export const revalidate = 3600
export const metadata: Metadata = {
  title: '英雄梯度表 | KingMeta',
  description: '巅峰千强英雄梯度，T0~T4完整分层，直接来源 pvp.mcxssg.net。',
}

const TIER_ORDER: TierLevel[] = ['T0', 'T0.5', 'T1', 'T2', 'T3', 'T4']
const TIER_INFO: Record<string, { desc: string; color: string }> = {
  'T0':   { desc: '版本最强', color: '#ef4444' },
  'T0.5': { desc: '强力首选', color: '#f97316' },
  'T1':   { desc: '稳定推荐', color: '#eab308' },
  'T2':   { desc: '均衡可用', color: '#22c55e' },
  'T3':   { desc: '需要技巧', color: '#3b82f6' },
  'T4':   { desc: '版本弱势', color: '#6b7280' },
}

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

async function getTierData() {
  const date = getYesterday()
  try {
    const [sr, tr] = await Promise.all([
      fetch(`${SOURCE}/api/herostats?date=${date}&gameMode=1`, { headers: HDR, next: { revalidate: 3600 } }),
      fetch(`${SOURCE}/api/global/tier?date=${date}&gameMode=1`, { headers: HDR, next: { revalidate: 3600 } }),
    ])
    const stats: RawStat[] = await sr.json()
    const td: { tiers: RawTier[] } = await tr.json()
    const sm = new Map(stats.map(h => [h.heroId, h]))

    const tiers: Record<string, HeroWithStats[]> = {}
    for (const t of td.tiers) {
      const s = sm.get(t.heroId)
      const roles = s ? s.roles.split('/').map((r: string) => r.trim()) : [t.role.split('/')[0]]
      const hero: HeroWithStats = {
        hero_id: String(t.heroId), name: t.heroName, avatar_url: t.avatarUrl, roles,
        is_new: s?.update ?? false, win_rate: s?.winRate, pick_rate: s?.pickRate, ban_rate: s?.banRate,
        tier: t.tierInRole as TierLevel, tier_score: t.finalNormalizedTierScore,
        hero_power: t.trueHeroPowerInRole, high_ban: t.highBan, low_pick: t.lowPick,
        rank_in_role: t.rankInRole, role_for_tier: t.role, meta_score: t.finalNormalizedTierScore,
      }
      if (!tiers[t.tierInRole]) tiers[t.tierInRole] = []
      tiers[t.tierInRole].push(hero)
    }
    for (const k of Object.keys(tiers)) {
      tiers[k].sort((a, b) => (b.tier_score ?? 0) - (a.tier_score ?? 0))
    }
    const totalCount = Object.values(tiers).reduce((s, arr) => s + arr.length, 0)
    return { tiers, date, totalCount }
  } catch (e) {
    console.error(e)
    return { tiers: {}, date: getYesterday(), totalCount: 0 }
  }
}

export default async function TierPage() {
  const { tiers, date, totalCount } = await getTierData()

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-6 py-5 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">英雄梯度表</h1>
        <p className="text-xs text-gray-500">
          巅峰千强 · {date} · {totalCount} 名英雄 · 来源 pvp.mcxssg.net
        </p>
      </div>

      {/* Tier groups */}
      <div className="space-y-8">
        {TIER_ORDER.filter(t => tiers[t]?.length).map(tier => {
          const info = TIER_INFO[tier]
          const list = tiers[tier]
          return (
            <div key={tier}>
              {/* Tier header */}
              <div className="flex items-center gap-3 mb-3.5">
                <TierBadge tier={tier} size="lg" />
                <div>
                  <div className="text-sm font-semibold text-white">{info.desc}</div>
                  <div className="text-[11px] text-gray-500">{list.length} 名英雄</div>
                </div>
                {/* Divider line */}
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent ml-2" />
              </div>

              {/* Hero cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {list.map(h => (
                  <HeroTierCard key={h.hero_id} h={h} tierColor={info.color} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HeroTierCard({ h, tierColor }: { h: HeroWithStats; tierColor: string }) {
  const winOk = h.win_rate != null
  const winColor = winOk
    ? (h.win_rate! >= 52 ? '#f97316' : h.win_rate! < 48 ? '#60a5fa' : '#9ca3af')
    : '#4b5563'

  return (
    <Link href={`/hero/${h.hero_id}`}
      className="group relative flex flex-col bg-[#0e0e1c] border border-white/[0.05] hover:border-orange-500/20 rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5">

      {/* Score bar accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{
        background: `linear-gradient(90deg, ${tierColor}, transparent)`,
        opacity: Math.min(1, (h.tier_score ?? 0) / 100)
      }} />

      {/* Avatar */}
      <div className="p-3 pb-0 flex justify-center">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(h.avatar_url)}
            alt={h.name ?? ''}
            className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10 group-hover:ring-2 transition-all"
            style={{ '--tw-ring-color': tierColor + '60' } as React.CSSProperties}
          />
          {h.high_ban && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center" title="必Ban">
              <span className="text-[7px] text-white font-bold">禁</span>
            </div>
          )}
          {h.is_new && (
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-orange-400 rounded-full ring-2 ring-[#0e0e1c]" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 pt-2 text-center">
        <div className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors mb-1 truncate">{h.name}</div>
        <div className="text-[10px] text-gray-500 truncate mb-2">{h.role_for_tier}</div>

        {/* Score */}
        <div className="text-lg font-bold mb-1" style={{ color: tierColor }}>
          {h.tier_score?.toFixed(1) ?? '--'}
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-2 text-[10px]">
          {h.win_rate != null && (
            <span style={{ color: winColor }}>{h.win_rate.toFixed(1)}%胜</span>
          )}
          {h.ban_rate != null && h.ban_rate > 0 && (
            <span className="text-gray-500">禁{h.ban_rate.toFixed(0)}%</span>
          )}
        </div>

        {/* Score bar */}
        <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, h.tier_score ?? 0)}%`, background: tierColor }} />
        </div>
      </div>
    </Link>
  )
}
