import { NextResponse } from 'next/server';
import { runBenchmark, runBenchmarkSweep } from '@/sim/benchmark';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { n_robots = 6, n_tasks = 24, max_ticks = 400, seed = 3, sweep = false } = body;

    if (sweep) {
      const results = runBenchmarkSweep();
      return NextResponse.json({ success: true, sweep: results });
    }

    const result = runBenchmark(
      Number(n_robots),
      Number(n_tasks),
      Number(max_ticks),
      Number(seed)
    );

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Default benchmark run on GET
  try {
    const result = runBenchmark(6, 24, 400, 3);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
