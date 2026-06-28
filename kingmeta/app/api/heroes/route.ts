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

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: HEADERS,
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`${path} => ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const date = searchParams.get('date') ?? getYesterday()

  try {
    // 同时拉两个 API
    const [stats, tierData] = await Promise.all([
      fetchJson<Array<{
        heroId: number; heroName: string; avatarUrl: string
        roles: string; winRate: number; pickRate: number; banRate: number; update: boolean
      }>>(`/api/herostats?date=${date}&gameMode=1`),
      fetchJson<{ queryDate: string; tiers: Array<{
        heroId: number; role: string
        trueHeroPowerInRole: number; finalNormalizedTierScore: number
        tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean
      }> }>(`/api/global/tier?date=${date}&gameMode=1`),
    ])

    const tierMap = new Map(tierData.tiers.map(t => [t.heroId, t]))

    // 合并数据
    let heroes = stats.map((h, idx) => {
      const tier = tierMap.get(h.heroId)
      const roles = typeof h.roles === 'string'
        ? h.roles.split('/').map(r => r.trim())
        : [String(h.roles)]
      return {
        hero_id: String(h.heroId),
        name: h.heroName,
        avatar_url: h.avatarUrl,
        roles,
        is_new: h.update,
        win_rate: h.winRate,
        pick_rate: h.pickRate,
        ban_rate: h.banRate,
        bp_rate: Math.round((h.pickRate + h.banRate) * 100) / 100,
        rank_no: idx + 1,
        // 直接用原站 tier
        tier: tier?.tierInRole ?? null,
        tier_score: tier?.finalNormalizedTierScore ?? null,
        hero_power: tier?.trueHeroPowerInRole ?? null,
        high_ban: tier?.highBan ?? false,
        low_pick: tier?.lowPick ?? false,
        rank_in_role: tier?.rankInRole ?? null,
        role_for_tier: tier?.role ?? null,
        // meta_score = finalNormalizedTierScore（直接用原站的）
        meta_score: tier?.finalNormalizedTierScore ?? null,
      }
    })

    // 按分路过滤
    if (role && role !== '全部') {
      heroes = heroes.filter(h => h.roles.some(r => r === role))
    }

    // 按 tier_score 排序（原站的 normalizedTierScore）
    heroes.sort((a, b) => {
      const sa = a.tier_score ?? 0
      const sb = b.tier_score ?? 0
      return sb - sa
    })

    return NextResponse.json({
      success: true,
      data: heroes,
      meta: { total: heroes.length, date, source: 'pvp.mcxssg.net' },
    })
  } catch (err) {
    console.error('[/api/heroes] error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
