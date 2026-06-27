/**
 * KingMeta Crawler — 直接调用 pvp.mcxssg.net 的内部 API
 * API 端点: /api/herostats /api/hero/equip /api/hero/bp /api/hero/behavior /api/detail/specifyheroperiod
 */

import axios from 'axios'

const BASE_URL = 'https://pvp.mcxssg.net'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': BASE_URL,
  'Accept': 'application/json',
}

async function get<T>(path: string): Promise<T> {
  const res = await axios.get<T>(`${BASE_URL}${path}`, { headers: HEADERS, timeout: 20000 })
  return res.data
}

function today(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1) // 用昨天的数据（今天数据可能未更新）
  return d.toISOString().split('T')[0]
}

// ========== 类型定义 ==========

export interface HeroStatRow {
  heroId: number
  heroName: string
  avatarUrl: string
  roles: string
  winRate: number
  pickRate: number
  banRate: number
  update: boolean
}

export interface HeroEquipSlot {
  slot: number
  topItems: {
    equipId: number
    equipName: string
    equipIcon: string
    pickRate: number
    winRate: number
    deltaWinRate: number
  }[]
  baseWinRate: number
}

export interface HeroBpData {
  heroId: number
  overallStats: {
    blueSideWinRate: number
    blueSidePickRate: number
    redSideWinRate: number
    redSidePickRate: number
    blueSideBanRate: number
    redSideBanRate: number
    totalWinRate: number
    earlyPickWinRate: number
    earlyPickPickRate: number
    latePickWinRate: number
    latePickPickRate: number
  }
  pickOrderStats: { winRate: number; pickRate: number; slotLabel: string }[]
  bpMode: string
  queryEndDate: string
}

export interface HeroBehaviorCategory {
  title: string
  icon: string
  dataCounts: {
    name: string
    data: string
    dataNote: string | null
    dataHighlight: boolean
  }[]
}

export interface HeroPeriodData {
  heroId: number
  avgWinDurationSeconds: number
  avgLossDurationSeconds: number
  winRateByDuration: { winRate: number; intervalRate: number; durationRange: string }[]
}

// ========== 主爬取函数 ==========

/** 获取全英雄列表+核心数据（每日调用一次） */
export async function fetchHeroStats(date?: string): Promise<HeroStatRow[]> {
  const d = date ?? today()
  // gameMode=1 = 巅峰千强
  const data = await get<HeroStatRow[]>(`/api/herostats?date=${d}&gameMode=1`)
  return data
}

/** 获取英雄出装数据 */
export async function fetchHeroEquip(heroId: number, date?: string): Promise<HeroEquipSlot[]> {
  const d = date ?? today()
  try {
    const data = await get<{ heroId: number; topItemsBySlot: HeroEquipSlot[] }>(
      `/api/hero/equip?heroId=${heroId}&date=${d}`
    )
    return data.topItemsBySlot ?? []
  } catch {
    return []
  }
}

/** 获取英雄BP（蓝红方/顺序）数据 */
export async function fetchHeroBp(heroId: number, date?: string): Promise<HeroBpData | null> {
  const d = date ?? today()
  try {
    return await get<HeroBpData>(`/api/hero/bp?heroId=${heroId}&date=${d}`)
  } catch {
    return null
  }
}

/** 获取英雄行为数据（参团率/视野等） */
export async function fetchHeroBehavior(heroId: number): Promise<HeroBehaviorCategory[]> {
  try {
    const data = await get<{ heroId: number; categories: HeroBehaviorCategory[] }>(
      `/api/hero/behavior?heroId=${heroId}`
    )
    return data.categories ?? []
  } catch {
    return []
  }
}

/** 获取英雄对局时长分析 */
export async function fetchHeroPeriod(heroId: number): Promise<HeroPeriodData | null> {
  try {
    return await get<HeroPeriodData>(`/api/detail/specifyheroperiod?heroId=${heroId}`)
  } catch {
    return null
  }
}

/** 获取趋势数据 */
export async function fetchTrends(): Promise<{ heroId: number; heroName: string; trend: number[]; trendDirection: string }[]> {
  try {
    const data = await get<{ data: { heroId: number; heroName: string; trend: number[]; trendDirection: string }[] }>(
      '/api/hero/trends?gameMode=1'
    )
    return data.data ?? []
  } catch {
    return []
  }
}

export default { fetchHeroStats, fetchHeroEquip, fetchHeroBp, fetchHeroBehavior, fetchHeroPeriod, fetchTrends }
