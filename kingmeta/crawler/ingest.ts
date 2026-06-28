/**
 * KingMeta Ingest — 每日拉取 pvp.mcxssg.net 数据写入 Supabase
 * 
 * Tier 算法（基于实际数据分布 score 范围 12.8~48.2, mean=19.9）：
 *   score = ban_rate * 0.5 + win_rate * 0.3 + pick_rate * 0.2
 *   T0:   >= 40  (极度强力，禁用率50%+)
 *   T0.5: >= 30  (强力，禁用率25%+)
 *   T1:   >= 22  (强势)
 *   T1.5: >= 18  (上位)
 *   T2:   >= 15  (平均)
 *   T3:   < 15   (弱势)
 */

import { createClient } from '@supabase/supabase-js'
import { fetchHeroStats } from './scraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function calcTier(winRate: number, pickRate: number, banRate: number): string {
  // ban_rate 是核心强度指标，win_rate 其次，pick_rate 辅助
  const score = banRate * 0.5 + winRate * 0.3 + pickRate * 0.2
  if (score >= 40) return 'T0'
  if (score >= 30) return 'T0.5'
  if (score >= 22) return 'T1'
  if (score >= 18) return 'T1.5'
  if (score >= 15) return 'T2'
  return 'T3'
}

function calcMetaScore(winRate: number, pickRate: number, banRate: number): number {
  const score = banRate * 0.5 + winRate * 0.3 + pickRate * 0.2
  return Math.round(score * 10) / 10
}

export async function runIngest() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const dateStr = date.toISOString().split('T')[0]

  console.log(`[Ingest] Starting for date ${dateStr}`)

  // 1. 获取全部英雄数据
  const stats = await fetchHeroStats(dateStr)
  console.log(`[Ingest] Got ${stats.length} heroes from API`)

  // 2. 更新 heroes 表（头像、分路）
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

  // 3. 写入 hero_stats（按日期去重）
  const statRows = stats.map((h, idx) => ({
    hero_id: String(h.heroId),
    stat_date: dateStr,
    game_mode: '巅峰千强',
    win_rate: h.winRate,
    pick_rate: h.pickRate,
    ban_rate: h.banRate,
    rank_no: idx + 1,
    // 正确的 meta_score 和 tier
    meta_score: calcMetaScore(h.winRate, h.pickRate, h.banRate),
    tier: calcTier(h.winRate, h.pickRate, h.banRate),
  }))

  const { error: statsError } = await supabase.from('hero_stats').upsert(statRows, {
    onConflict: 'hero_id,stat_date,game_mode'
  })
  if (statsError) console.error('[Ingest] stats error:', statsError)
  else console.log(`[Ingest] Upserted ${statRows.length} stat rows`)

  // 4. 写入 updates 记录
  await supabase.from('updates').insert({ updated_at: new Date().toISOString(), hero_count: stats.length })

  console.log('[Ingest] Done.')
  return { date: dateStr, heroCount: stats.length }
}

export default runIngest
