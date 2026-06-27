export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 300

export async function GET(_req: NextRequest) {
  try {
    // Get latest two dates
    const { data: dates } = await supabaseAdmin
      .from('hero_stats')
      .select('stat_date')
      .eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false })
      .limit(2)

    if (!dates || dates.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const [latest, prev] = dates

    const [latestStats, prevStats] = await Promise.all([
      supabaseAdmin
        .from('hero_stats')
        .select('hero_id, win_rate, pick_rate, ban_rate, tier, meta_score, heroes(name, avatar_url, roles)')
        .eq('stat_date', latest.stat_date)
        .eq('game_mode', '巅峰千强'),
      supabaseAdmin
        .from('hero_stats')
        .select('hero_id, win_rate, pick_rate, ban_rate, tier, meta_score')
        .eq('stat_date', prev.stat_date)
        .eq('game_mode', '巅峰千强'),
    ])

    const prevMap = new Map(
      (prevStats.data ?? []).map((s: Record<string, unknown>) => [s.hero_id, s])
    )

    const trending = (latestStats.data ?? [])
      .map((curr: Record<string, unknown>) => {
        const p = prevMap.get(curr.hero_id) as Record<string, unknown> | undefined
        const h = curr.heroes as Record<string, unknown> | null
        return {
          hero_id: curr.hero_id,
          name: h?.name,
          avatar_url: h?.avatar_url,
          roles: h?.roles,
          win_rate: curr.win_rate,
          pick_rate: curr.pick_rate,
          ban_rate: curr.ban_rate,
          tier: curr.tier,
          meta_score: curr.meta_score,
          delta_win: p ? (curr.win_rate as number) - (p.win_rate as number) : 0,
          delta_pick: p ? (curr.pick_rate as number) - (p.pick_rate as number) : 0,
        }
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
        Math.abs(b.delta_win as number) - Math.abs(a.delta_win as number)
      )
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      data: trending,
      meta: { latest: latest.stat_date, prev: prev.stat_date },
    })
  } catch (err) {
    console.error('[API /trending]', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch trending' }, { status: 500 })
  }
}
