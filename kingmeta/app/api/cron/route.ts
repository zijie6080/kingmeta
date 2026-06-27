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
    const { runIngest } = await import('@/crawler/ingest')
    const result = await runIngest()
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[CRON] Fatal:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
