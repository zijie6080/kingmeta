export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CRON] Starting daily crawl...')

  try {
    // Dynamic import to avoid build-time initialization
    const { runIngestor } = await import('@/crawler/ingest')
    const result = await runIngestor()
    console.log('[CRON] Done:', result)
    return NextResponse.json({ success: result.success, heroCount: result.heroCount, duration: result.duration, errors: result.errors })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[CRON] Fatal:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
