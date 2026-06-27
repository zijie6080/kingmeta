export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 1) {
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    // Get latest date
    const { data: latestDate } = await supabaseAdmin
      .from('hero_stats')
      .select('stat_date')
      .eq('game_mode', '巅峰千强')
      .order('stat_date', { ascending: false })
      .limit(1)
      .single()

    // Search heroes by name
    const { data: matchedHeroes } = await supabaseAdmin
      .from('heroes')
      .select('id, name, alias, avatar_url, roles')
      .or(`name.ilike.%${q}%,alias.ilike.%${q}%`)
      .limit(10)

    if (!matchedHeroes?.length) {
      return NextResponse.json({ success: true, data: [] })
    }

    const ids = matchedHeroes.map((h: { id: string }) => h.id)

    // Get latest stats for matched heroes
    const { data: stats } = latestDate
      ? await supabaseAdmin
          .from('hero_stats')
          .select('hero_id, win_rate, pick_rate, ban_rate, tier, rank_no')
          .in('hero_id', ids)
          .eq('stat_date', latestDate.stat_date)
      : { data: [] }

    const statsMap = new Map(
      (stats ?? []).map((s: Record<string, unknown>) => [s.hero_id, s])
    )

    const results = matchedHeroes.map((h: Record<string, unknown>) => ({
      ...h,
      ...(statsMap.get(h.id as string) ?? {}),
    }))

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('[API /search]', err)
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}
