import { NextRequest, NextResponse } from 'next/server';
import { runPayPilotAgent } from '@/lib/agent';
import { assertBaseSepoliaSafety } from '@/lib/x402-client';
import { PAYPILOT_CONFIG } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    // Application-level safety assertion: Base Sepolia ONLY
    assertBaseSepoliaSafety(PAYPILOT_CONFIG.chain.chainId, PAYPILOT_CONFIG.chain.caip2);

    const body = await req.json().catch(() => ({}));
    const task = body.task || body.prompt;
    const userWalletAddress = body.userWalletAddress;

    if (!task || typeof task !== 'string' || task.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field "task" in request body.',
          code: 'INVALID_TASK_INPUT',
        },
        { status: 400 }
      );
    }

    if (!userWalletAddress || typeof userWalletAddress !== 'string' || !userWalletAddress.startsWith('0x') || userWalletAddress.length !== 42) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized execution: A valid connected Base Sepolia wallet address must be provided in "userWalletAddress".',
          code: 'UNAUTHORIZED_WALLET_REQUIRED',
        },
        { status: 401 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const originUrl = `${protocol}://${host}`;

    const result = await runPayPilotAgent(task, userWalletAddress, originUrl);

    if (!result.success && result.error?.includes('POLICY_REJECTED')) {
      return NextResponse.json(result, { status: 402 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent execution failed';
    return NextResponse.json(
      {
        success: false,
        error: msg,
        code: 'AGENT_EXECUTION_ERROR',
      },
      { status: 500 }
    );
  }
}
