import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/storage';

export async function GET() {
  try {
    const policy = await dataStore.getPolicy();
    return NextResponse.json({ success: true, policy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch policy';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedPolicy = await dataStore.savePolicy(body);
    return NextResponse.json({ success: true, policy: updatedPolicy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update policy';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
