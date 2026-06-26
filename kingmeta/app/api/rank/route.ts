import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 300

export async function GET(_req: NextRequest) {
  try {
    const { data: latestDate } = await supabaseAdmin
      .from('hero_stats')
      .select('stat_date')
      .eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false })
      .limit(1)
      .single()

    if (!latestDate) {
      return NextResponse.json({ success: true, data: { win_rate: [], pick_rate: [], ban_rate: [] } })
    }

    const base = supabaseAdmin
      .from('hero_stats')
      .select(`
        hero_id, rank_no, win_rate, pick_rate, ban_rate, bp_rate, tier, meta_score,
        heroes ( name, alias, avatar_url, roles )
      `)
      .eq('stat_date', latestDate.stat_date)
      .eq('game_mode', '巅峰千强')

    const flatten = (rows: Record<string, unknown>[]) =>
      rows.map(row => {
        const h = row.heroes as Record<string, unknown> | null
        return { ...row, heroes: undefined, name: h?.name, avatar_url: h?.avatar_url, roles: h?.roles }
      })

    const [byWin, byPick, byBan] = await Promise.all([
      base.order('win_rate', { ascending: false }).limit(10),
      base.order('pick_rate', { ascending: false }).limit(10),
      base.order('ban_rate', { ascending: false }).limit(10),
    ])

    return NextResponse.json({
      success: true,
      data: {
        win_rate: flatten(byWin.data ?? []),
        pick_rate: flatten(byPick.data ?? []),
        ban_rate: flatten(byBan.data ?? []),
      },
      meta: { date: latestDate.stat_date },
    })
  } catch (err) {
    console.error('[API /rank]', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch ranks' }, { status: 500 })
  }
}
