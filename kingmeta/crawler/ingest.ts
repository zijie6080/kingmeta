/**
 * KingMeta Data Ingestor
 * Takes scraped data and upserts into Supabase
 * Handles deduplication, tier calculation, meta_score
 */

import { createClient } from '@supabase/supabase-js'
import { scrapeHeroStats, ScrapedHeroStat } from './scraper'
import { SEED_HEROES, heroAvatarUrl } from '../lib/hero-data'
import { computeMetaScore, getTierFromScore } from '../lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function ensureHeroesExist(): Promise<void> {
  console.log('[Ingestor] Ensuring hero records exist...')
  
  const upserts = SEED_HEROES.map(h => ({
    id: h.id,
    name: h.name,
    alias: h.alias ?? null,
    avatar_url: heroAvatarUrl(h.id),
    roles: h.roles,
    difficulty: h.difficulty,
    is_new: false,
    updated_at: new Date().toISOString(),
  }))
  
  const { error } = await supabase
    .from('heroes')
    .upsert(upserts, { onConflict: 'id' })
  
  if (error) {
    console.error('[Ingestor] Hero upsert error:', error)
    throw error
  }
  console.log(`[Ingestor] Ensured ${upserts.length} heroes`)
}

function computeTierScore(stat: ScrapedHeroStat): number {
  const win = stat.win_rate ?? 50
  const pick = stat.pick_rate ?? 5
  const ban = stat.ban_rate ?? 5
  return +(ban * 0.5 + win * 0.3 + pick * 0.2).toFixed(1)
}

async function ingestStats(stats: ScrapedHeroStat[], date: string, version: string): Promise<number> {
  if (stats.length === 0) return 0
  
  // Compute tier scores for all heroes
  const tierScores = stats.map(s => computeTierScore(s))
  const maxScore = Math.max(...tierScores)
  
  const rows = stats.map((stat, idx) => {
    const score = tierScores[idx]
    const pct = (score / maxScore) * 100
    
    let tier = 'T4'
    if (pct >= 90) tier = 'T0'
    else if (pct >= 78) tier = 'T0.5'
    else if (pct >= 65) tier = 'T1'
    else if (pct >= 52) tier = 'T1.5'
    else if (pct >= 40) tier = 'T2'
    else if (pct >= 28) tier = 'T3'
    
    const metaScore = computeMetaScore(
      stat.win_rate ?? 50,
      stat.pick_rate ?? 5,
      stat.ban_rate ?? 5
    )
    
    return {
      hero_id: stat.hero_id,
      stat_date: date,
      rank_no: stat.rank_no,
      win_rate: stat.win_rate,
      pick_rate: stat.pick_rate,
      ban_rate: stat.ban_rate,
      bp_rate: stat.bp_rate,
      team_rate: stat.team_rate,
      dmg_share: stat.dmg_share,
      dmg_per_min: stat.dmg_per_min,
      tank_share: stat.tank_share,
      tank_per_min: stat.tank_per_min,
      gold_per_min: stat.gold_per_min,
      medal_rate: stat.medal_rate,
      tier,
      meta_score: metaScore,
      game_mode: '巅峰千强',
      version,
    }
  })
  
  // Filter to only heroes that exist in DB
  const { data: existingHeroes } = await supabase
    .from('heroes')
    .select('id')
  
  const heroIds = new Set((existingHeroes ?? []).map((h: { id: string }) => h.id))
  const validRows = rows.filter(r => heroIds.has(r.hero_id))
  
  if (validRows.length === 0) {
    console.warn('[Ingestor] No valid rows to insert (no matching hero IDs)')
    return 0
  }
  
  const { error } = await supabase
    .from('hero_stats')
    .upsert(validRows, { onConflict: 'hero_id,stat_date,game_mode' })
  
  if (error) {
    console.error('[Ingestor] Stats upsert error:', error)
    throw error
  }
  
  console.log(`[Ingestor] Upserted ${validRows.length} stat rows for ${date}`)
  return validRows.length
}

async function logRun(status: string, heroCount: number, errors: string[], durationMs: number): Promise<void> {
  await supabase.from('crawl_logs').insert({
    status,
    duration_ms: durationMs,
    heroes_updated: heroCount,
    errors: errors.length > 0 ? errors : null,
  })
  
  if (status === 'success' || status === 'partial') {
    await supabase.from('updates').insert({
      version: new Date().toISOString().split('T')[0],
      status,
      hero_count: heroCount,
      notes: errors.length > 0 ? errors.join('; ') : null,
    })
  }
}

export async function runIngestor(): Promise<{
  success: boolean
  heroCount: number
  errors: string[]
  duration: number
}> {
  const start = Date.now()
  
  try {
    // 1. Ensure all heroes exist
    await ensureHeroesExist()
    
    // 2. Scrape
    const result = await scrapeHeroStats()
    console.log(`[Ingestor] Scraped ${result.stats.length} heroes, errors: ${result.errors.length}`)
    
    // 3. Ingest
    const count = await ingestStats(result.stats, result.date, result.version)
    
    const duration = Date.now() - start
    const status = result.errors.length > 0 ? 'partial' : 'success'
    
    await logRun(status, count, result.errors, duration)
    
    return { success: true, heroCount: count, errors: result.errors, duration }
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const duration = Date.now() - start
    
    await logRun('failed', 0, [msg], duration)
    
    return { success: false, heroCount: 0, errors: [msg], duration }
  }
}

// CLI entry point
if (require.main === module) {
  runIngestor().then(result => {
    console.log('[Ingestor] Done:', result)
    process.exit(result.success ? 0 : 1)
  })
}
