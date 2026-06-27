export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const [heroRes, statRes, trendRes] = await Promise.all([
      supabaseAdmin.from('heroes').select('*').eq('id', id).single(),
      supabaseAdmin.from('hero_stats').select('*')
        .eq('hero_id', id).eq('game_mode', '巅峰千强')
        .order('stat_date', { ascending: false }).limit(1).single(),
      supabaseAdmin.from('hero_stats')
        .select('stat_date, win_rate, pick_rate, ban_rate, tier, meta_score')
        .eq('hero_id', id).eq('game_mode', '巅峰千强')
        .order('stat_date', { ascending: false }).limit(14),
    ])

    if (!heroRes.data) {
      return NextResponse.json({ success: false, error: 'Hero not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        hero: heroRes.data,
        stat: statRes.data ?? null,
        trend: (trendRes.data ?? []).reverse(),
      },
    })
  } catch (err) {
    console.error('[API /heroes/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
