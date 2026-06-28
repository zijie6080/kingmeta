export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? getYesterday()

  try {
    const [stats, tierData] = await Promise.all([
      fetch(`${BASE_URL}/api/herostats?date=${date}&gameMode=1`, { headers: HEADERS, next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${BASE_URL}/api/global/tier?date=${date}&gameMode=1`, { headers: HEADERS, next: { revalidate: 3600 } }).then(r => r.json()),
    ])

    const statsMap = new Map(stats.map((h: { heroId: number }) => [h.heroId, h]))
    const tierMap = new Map((tierData.tiers ?? []).map((t: { heroId: number }) => [t.heroId, t]))

    const heroes = (tierData.tiers ?? []).map((t: {
      heroId: number; heroName: string; avatarUrl: string; role: string
      finalNormalizedTierScore: number; trueHeroPowerInRole: number
      tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean
    }) => {
      const s = (statsMap.get(t.heroId) ?? {}) as {
        winRate?: number; pickRate?: number; banRate?: number; roles?: string; update?: boolean
      }
      const roles = typeof s.roles === 'string'
        ? s.roles.split('/').map((r: string) => r.trim())
        : [t.role?.split('/')[0] ?? '']
      return {
        hero_id: String(t.heroId),
        name: t.heroName,
        avatar_url: t.avatarUrl,
        roles,
        is_new: s.update ?? false,
        win_rate: s.winRate ?? null,
        pick_rate: s.pickRate ?? null,
        ban_rate: s.banRate ?? null,
        tier: t.tierInRole,
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
    heroes.sort((a: { tier_score: number }, b: { tier_score: number }) => b.tier_score - a.tier_score)

    return NextResponse.json({ success: true, data: heroes, meta: { total: heroes.length, date } })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
