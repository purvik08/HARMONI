import { NextResponse } from 'next/server';
import { ALL_SCENARIOS } from '@/sim/scenarios';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ name: string }> }
) {
  try {
    const params = await props.params;
    const scenarioName = params.name;
    const scenarioFn = ALL_SCENARIOS[scenarioName];

    if (!scenarioFn) {
      return NextResponse.json(
        {
          success: false,
          error: `Scenario '${scenarioName}' not found. Available: ${Object.keys(
            ALL_SCENARIOS
          ).join(', ')}`,
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') as 'harmoni' | 'baseline') || 'harmoni';

    const log = scenarioFn(mode);

    return NextResponse.json({ success: true, log });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
