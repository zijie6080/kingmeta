/**
 * KingMeta Ingest — 直接搬运 pvp.mcxssg.net 的全部数据
 * 数据源：
 *   /api/herostats        — 胜率/出场率/禁用率
 *   /api/global/tier      — Tier 评级（直接用原站算法，finalNormalizedTierScore）
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BASE_URL = 'https://pvp.mcxssg.net'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': BASE_URL,
  'Accept': 'application/json',
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: HEADERS,
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`${path} => ${res.status}`)
  return res.json()
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

interface HeroStat {
  heroId: number
  heroName: string
  avatarUrl: string
  roles: string
  winRate: number
  pickRate: number
  banRate: number
  update: boolean
}

interface TierEntry {
  heroId: number
  heroName: string
  avatarUrl: string
  date: string
  role: string
  trueHeroPowerInRole: number
  finalNormalizedTierScore: number
  tierInRole: string
  rankInRole: number
  lowPick: boolean
  highBan: boolean
}

export async function runIngest() {
  const dateStr = getYesterday()
  console.log(`[Ingest] Starting for date ${dateStr}`)

  // 1. 拉取两个数据源
  const [stats, tierData] = await Promise.all([
    fetchJson<HeroStat[]>(`/api/herostats?date=${dateStr}&gameMode=1`),
    fetchJson<{ queryDate: string; tiers: TierEntry[] }>(`/api/global/tier?date=${dateStr}&gameMode=1`),
  ])

  const tierMap = new Map(tierData.tiers.map(t => [t.heroId, t]))
  console.log(`[Ingest] stats=${stats.length} tiers=${tierData.tiers.length}`)

  // 2. 更新 heroes 表
  for (const h of stats) {
    const roles = typeof h.roles === 'string'
      ? h.roles.split('/').map((r: string) => r.trim())
      : [String(h.roles)]
    await supabase.from('heroes').upsert({
      id: String(h.heroId),
      name: h.heroName,
      avatar_url: h.avatarUrl,
      roles,
      is_new: h.update,
    }, { onConflict: 'id' })
  }
  console.log(`[Ingest] Updated ${stats.length} hero profiles`)

  // 3. 写入 hero_stats — 直接搬运原站数据
  const statRows = stats.map((h, idx) => {
    const tierEntry = tierMap.get(h.heroId)
    return {
      hero_id: String(h.heroId),
      stat_date: dateStr,
      game_mode: '巅峰千强',
      win_rate: h.winRate,
      pick_rate: h.pickRate,
      ban_rate: h.banRate,
      bp_rate: h.pickRate + h.banRate,
      rank_no: idx + 1,
      // 直接用原站 tier（finalNormalizedTierScore → tier_score，tierInRole → tier）
      tier: tierEntry?.tierInRole ?? null,
      tier_score: tierEntry?.finalNormalizedTierScore ?? null,
      hero_power: tierEntry?.trueHeroPowerInRole ?? null,
      high_ban: tierEntry?.highBan ?? false,
      low_pick: tierEntry?.lowPick ?? false,
      rank_in_role: tierEntry?.rankInRole ?? null,
      role_for_tier: tierEntry?.role ?? null,
      // meta_score 也直接用原站的 normalizedTierScore
      meta_score: tierEntry?.finalNormalizedTierScore ?? null,
    }
  })

  const { error: statsError } = await supabase.from('hero_stats').upsert(statRows, {
    onConflict: 'hero_id,stat_date,game_mode'
  })
  if (statsError) console.error('[Ingest] stats error:', statsError)
  else console.log(`[Ingest] Upserted ${statRows.length} stat rows`)

  // 4. 写入 updates 记录
  await supabase.from('updates').insert({
    updated_at: new Date().toISOString(),
    hero_count: stats.length,
    notes: `tier data: ${tierData.tiers.length} entries from pvp.mcxssg.net`,
  })

  console.log('[Ingest] Done.')
  return { date: dateStr, heroCount: stats.length, tierCount: tierData.tiers.length }
}

export default runIngest
