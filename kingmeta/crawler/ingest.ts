/**
 * KingMeta Ingest — 把爬来的数据写入 Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { fetchHeroStats, fetchHeroBp, fetchHeroEquip, fetchHeroBehavior } from './scraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function calcTier(winRate: number, pickRate: number, banRate: number): string {
  const bp = winRate * 0.5 + pickRate * 0.3 + banRate * 0.2
  if (bp >= 50) return 'T0'
  if (bp >= 45) return 'T0.5'
  if (bp >= 40) return 'T1'
  if (bp >= 35) return 'T1.5'
  if (bp >= 28) return 'T2'
  if (bp >= 20) return 'T3'
  return 'T4'
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
    await supabase.from('heroes').upsert({
      id: String(h.heroId),
      name: h.heroName,
      avatar_url: h.avatarUrl,
      roles: h.roles.split('/').map(r => r.trim()),
      is_new: h.update,
    }, { onConflict: 'id' })
  }

  // 3. 写入 hero_stats
  const statRows = stats.map((h, i) => ({
    hero_id: String(h.heroId),
    stat_date: dateStr,
    game_mode: '巅峰千强',
    rank_no: i + 1,
    win_rate: h.winRate,
    pick_rate: h.pickRate,
    ban_rate: h.banRate,
    bp_rate: h.winRate && h.pickRate && h.banRate
      ? Math.round((h.pickRate + h.banRate) * 10) / 10 : null,
    meta_score: Math.round((h.winRate * 0.5 + h.pickRate * 0.3 + h.banRate * 0.2) * 10) / 10,
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
