export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 300 // 5 min cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const mode = searchParams.get('mode') ?? '巅峰千强'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500)

  try {
    // Get latest date for this mode
    const { data: latestDate } = await supabaseAdmin
      .from('hero_stats')
      .select('stat_date')
      .eq('game_mode', mode)
      .order('stat_date', { ascending: false })
      .limit(1)
      .single()

    if (!latestDate) {
      return NextResponse.json({ success: true, data: [], meta: { total: 0 } })
    }

    // Query hero_stats joined with heroes for latest date
    let query = supabaseAdmin
      .from('hero_stats')
      .select(`
        *,
        heroes (
          name, alias, avatar_url, roles, difficulty, is_new
        )
      `)
      .eq('stat_date', latestDate.stat_date)
      .eq('game_mode', mode)
      .order('rank_no', { ascending: true })
      .limit(limit)

    const { data, error } = await query

    if (error) throw error

    // Flatten the join
    const heroes = (data ?? []).map((row: Record<string, unknown>) => {
      const h = row.heroes as Record<string, unknown> | null
      return {
        ...row,
        heroes: undefined,
        name: h?.name,
        alias: h?.alias,
        avatar_url: h?.avatar_url,
        roles: h?.roles,
        difficulty: h?.difficulty,
        is_new: h?.is_new,
      }
    })

    // Filter by role if specified
    const filtered = role && role !== '全部分路'
      ? heroes.filter((h: Record<string, unknown>) => {
          const roles = h.roles as string[] | null
          return roles?.some((r: string) => r.includes(role))
        })
      : heroes

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: {
        total: filtered.length,
        date: latestDate.stat_date,
        mode,
      },
    })
  } catch (err: unknown) {
    console.error('[API /heroes]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch heroes' },
      { status: 500 }
    )
  }
}
