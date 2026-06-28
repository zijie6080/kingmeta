/**
 * 统一管理 pvp.mcxssg.net API 调用
 */

export const SOURCE = 'https://pvp.mcxssg.net'
export const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Referer': SOURCE,
  'Accept': 'application/json',
}

export async function fetchSource<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const r = await fetch(`${SOURCE}${path}`, { headers: HEADERS, next: { revalidate } })
    return r.ok ? (await r.json() as T) : null
  } catch { return null }
}

/** 找最近有数据的日期（stats 不为空） */
export async function getLatestDate(): Promise<string> {
  for (let daysAgo = 1; daysAgo <= 5; daysAgo++) {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    const dateStr = d.toISOString().split('T')[0]
    const data = await fetchSource<unknown[]>(`/api/herostats?date=${dateStr}&gameMode=1`)
    if (Array.isArray(data) && data.length > 0) return dateStr
  }
  // fallback: 4 days ago
  const d = new Date(); d.setDate(d.getDate() - 4)
  return d.toISOString().split('T')[0]
}

export interface RawStat {
  heroId: number; heroName: string; avatarUrl: string
  roles: string; winRate: number; pickRate: number; banRate: number; update: boolean
  qAreaTop10Power?: number; qAreaTop100Power?: number
}
export interface RawTier {
  heroId: number; heroName: string; avatarUrl: string; role: string
  trueHeroPowerInRole: number; finalNormalizedTierScore: number
  tierInRole: string; rankInRole: number; lowPick: boolean; highBan: boolean
}
