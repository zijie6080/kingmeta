export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 300

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Hero base info
    const { data: hero, error: heroError } = await supabaseAdmin
      .from('heroes')
      .select('*')
      .eq('id', id)
      .single()

    if (heroError || !hero) {
      return NextResponse.json({ success: false, error: 'Hero not found' }, { status: 404 })
    }

    // Latest stat
    const { data: latestStat } = await supabaseAdmin
      .from('hero_stats')
      .select('*')
      .eq('hero_id', id)
      .order('stat_date', { ascending: false })
      .limit(1)
      .single()

    // Last 7 days trend
    const { data: trend } = await supabaseAdmin
      .from('hero_stats')
      .select('stat_date, win_rate, pick_rate, ban_rate, tier, meta_score')
      .eq('hero_id', id)
      .eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false })
      .limit(14)

    // Latest build
    const { data: build } = await supabaseAdmin
      .from('hero_builds')
      .select('*')
      .eq('hero_id', id)
      .order('build_date', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        hero,
        stat: latestStat ?? null,
        trend: (trend ?? []).reverse(),
        build: build ?? null,
      },
    })
  } catch (err) {
    console.error('[API /heroes/[id]]', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
