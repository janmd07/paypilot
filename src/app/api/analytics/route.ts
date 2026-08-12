import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/storage';

export async function GET() {
  try {
    const metrics = await dataStore.getGrantMetrics();
    const transactions = await dataStore.getTransactions();
    return NextResponse.json({
      success: true,
      metrics,
      transactions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.walletAddress) {
      const userCount = await dataStore.recordUserOnboarding(body.walletAddress);
      return NextResponse.json({ success: true, allTimeUsersOnboarded: userCount });
    }
    return NextResponse.json({ success: false, error: 'Missing walletAddress' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record user onboarding';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
