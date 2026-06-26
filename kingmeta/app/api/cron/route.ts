import { NextRequest, NextResponse } from 'next/server'
import { runIngestor } from '@/crawler/ingest'

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets Authorization header for cron jobs)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CRON] Starting daily crawl...')

  try {
    const result = await runIngestor()
    console.log('[CRON] Done:', result)

    return NextResponse.json({
      success: result.success,
      heroCount: result.heroCount,
      duration: result.duration,
      errors: result.errors,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[CRON] Fatal:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
