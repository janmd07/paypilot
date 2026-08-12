import { NextRequest, NextResponse } from 'next/server';
import { handleX402Protection } from '@/lib/x402-server';
import { fetchLiveMarketData } from '@/lib/market-data';

export async function GET(req: NextRequest) {
  const result = await handleX402Protection(
    req,
    '/api/paid/market-summary',
    0.01,
    'BTC & ETH Market Intelligence Summary ($0.01 USDC)'
  );

  if (result.type === 'CONFIG_ERROR' || result.type === 'CHALLENGE') {
    return result.response;
  }

  try {
    const liveData = await fetchLiveMarketData();

    const response = NextResponse.json({
      success: true,
      service: 'paypilot-market-summary',
      network: 'eip155:84532',
      chainId: 84532,
      timestamp: new Date().toISOString(),
      price: '$0.01 USDC',
      data: liveData,
    });

    response.headers.set('PAYMENT-RESPONSE', result.settlementHeader);
    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Market data service is temporarily unavailable';
    console.error('Failed to serve paid market-summary resource:', errorMsg);

    const response = NextResponse.json(
      {
        success: false,
        service: 'paypilot-market-summary',
        network: 'eip155:84532',
        chainId: 84532,
        timestamp: new Date().toISOString(),
        price: '$0.01 USDC',
        error: errorMsg,
        data: {
          summary: 'Market data is temporarily unavailable from the public API source.',
        },
      },
      { status: 503 }
    );

    response.headers.set('PAYMENT-RESPONSE', result.settlementHeader);
    return response;
  }
}
