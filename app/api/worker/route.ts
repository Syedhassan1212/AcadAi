import { NextRequest, NextResponse } from 'next/server';
import { runAdaptationWorker } from '@/lib/background/worker';

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  // Protect with secret token
  const authHeader = req.headers.get('authorization');
  const workerSecret = process.env.WORKER_SECRET;

  if (!workerSecret || authHeader !== `Bearer ${workerSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Worker] Starting adaptation loop...');
    const result = await runAdaptationWorker();
    console.log('[Worker] Completed:', result);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[Worker] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Also allow GET for testing (same auth)
export async function GET(req: NextRequest) {
  return POST(req);
}
