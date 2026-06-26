// ==========================================
// KingMeta – shared TypeScript types
// ==========================================

export type HeroRole = '对抗路' | '打野' | '中路' | '发育路' | '游走' | '全部分路'
export type GameMode = '全分段' | '1350+' | '顶端排位' | '巅峰千强'
export type TierLevel = 'T0' | 'T0.5' | 'T1' | 'T1.5' | 'T2' | 'T3' | 'T4'

export interface Hero {
  id: string
  name: string
  alias?: string
  avatar_url?: string
  roles: string[]
  difficulty: number
  is_new: boolean
  created_at: string
  updated_at: string
}

export interface HeroStat {
  id: number
  hero_id: string
  stat_date: string
  rank_no: number
  win_rate: number
  pick_rate: number
  ban_rate: number
  bp_rate: number
  team_rate: number
  dmg_share: number
  dmg_per_min: number
  tank_share: number
  tank_per_min: number
  gold_per_min: number
  medal_rate: number
  tier: TierLevel
  meta_score: number
  game_mode: string
  version: string
}

export interface HeroWithStats extends Hero, HeroStat {
  name: string
  roles: string[]
  avatar_url?: string
}

export interface HeroBuild {
  id: number
  hero_id: string
  build_date: string
  items: BuildItem[]
  runes: Rune[]
  win_rate: number
  game_mode: string
}

export interface BuildItem {
  name: string
  icon: string
  order: number
}

export interface Rune {
  name: string
  icon: string
}

export interface Update {
  id: number
  version: string
  updated_at: string
  status: string
  hero_count: number
  notes?: string
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: {
    total?: number
    date?: string
    version?: string
  }
}

export interface TierGroup {
  tier: TierLevel
  heroes: HeroWithStats[]
}

export interface RankData {
  win_rate: HeroWithStats[]
  pick_rate: HeroWithStats[]
  ban_rate: HeroWithStats[]
}

// Crawler types
export interface CrawlResult {
  heroes: Partial<Hero>[]
  stats: Partial<HeroStat>[]
  date: string
  version: string
}
