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

async function safeGet<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS, next: { revalidate } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const date = getYesterday()

  try {
    // 拉所有相关数据
    const [stats, tierData, equip, bp, behavior, period] = await Promise.all([
      safeGet<Array<{ heroId: number; heroName: string; avatarUrl: string; roles: string; winRate: number; pickRate: number; banRate: number; update: boolean }>>(
        `/api/herostats?date=${date}&gameMode=1`
      ),
      safeGet<{ tiers: Array<{ heroId: number; role: string; trueHeroPowerInRole: number; finalNormalizedTierScore: number; tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean }> }>(
        `/api/global/tier?date=${date}&gameMode=1`
      ),
      safeGet<{ topItemsBySlot: unknown[] }>(`/api/hero/equip?heroId=${id}&date=${date}`),
      safeGet<unknown>(`/api/hero/bp?heroId=${id}&date=${date}`),
      safeGet<{ categories: unknown[] }>(`/api/hero/behavior?heroId=${id}`),
      safeGet<unknown>(`/api/detail/specifyheroperiod?heroId=${id}`),
    ])

    const heroStat = (stats ?? []).find(h => String(h.heroId) === id)
    const tierEntry = (tierData?.tiers ?? []).find(t => String(t.heroId) === id)

    if (!heroStat) {
      return NextResponse.json({ success: false, error: 'Hero not found' }, { status: 404 })
    }

    const roles = typeof heroStat.roles === 'string'
      ? heroStat.roles.split('/').map((r: string) => r.trim())
      : [String(heroStat.roles)]

    return NextResponse.json({
      success: true,
      data: {
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
          meta_score: tierEntry?.finalNormalizedTierScore ?? null,
        },
        equip: (equip as { topItemsBySlot?: unknown[] } | null)?.topItemsBySlot ?? [],
        bp: bp ?? null,
        behavior: (behavior as { categories?: unknown[] } | null)?.categories ?? [],
        period: period ?? null,
      },
    })
  } catch (err) {
    console.error('[API /heroes/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
