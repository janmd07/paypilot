import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchLiveMarketData } from '../lib/market-data';
import { publicClient } from '../lib/wallet';
import fs from 'fs';
import path from 'path';

// Mock viem public client methods
vi.mock('../lib/wallet', () => {
  return {
    publicClient: {
      getBlockNumber: vi.fn(),
      getGasPrice: vi.fn(),
    },
  };
});

describe('Live Market Data Utility Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. Fetches and processes Binance prices and Base Sepolia RPC metrics correctly', async () => {
    // Mock global fetch for Binance API
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('BTCUSDT')) {
        return Promise.resolve(new Response(JSON.stringify({
          lastPrice: '62000.50',
          priceChangePercent: '-1.45',
          highPrice: '63100.00',
          lowPrice: '61500.00',
        }), { status: 200 }));
      }
      if (url.includes('ETHUSDT')) {
        return Promise.resolve(new Response(JSON.stringify({
          lastPrice: '3200.75',
          priceChangePercent: '+2.10',
          highPrice: '3250.00',
          lowPrice: '3150.00',
        }), { status: 200 }));
      }
      return Promise.reject(new Error('Unknown url'));
    });

    // Mock RPC calls
    (publicClient.getBlockNumber as any).mockResolvedValue(BigInt(987654321));
    (publicClient.getGasPrice as any).mockResolvedValue(BigInt(2500000)); // 0.0025 Gwei

    const result = await fetchLiveMarketData();

    // Verify parsed structure and formatted values
    expect(result!.btc!.price).toBe('62,000.50');
    expect(result!.btc!.change24h).toBe('-1.45%');
    expect(result!.btc!.high24h).toBe('63,100.00');
    expect(result!.btc!.low24h).toBe('61,500.00');

    expect(result!.eth!.price).toBe('3,200.75');
    expect(result!.eth!.change24h).toBe('+2.10%');
    expect(result!.eth!.high24h).toBe('3,250.00');
    expect(result!.eth!.low24h).toBe('3,150.00');

    expect(result!.baseSepoliaStats?.blockNumber).toBe(987654321);
    expect(result!.baseSepoliaStats?.averageGasGwei).toBe('0.002500');
    expect(result!.summary).toContain('Overall 24h momentum is mixed');
    expect(result!.summary).toContain('BTC/USD is trading at $62,000.50 (-1.45%)');
    expect(result!.summary).toContain('ETH/USD is at $3,200.75 (+2.10%)');
  });

  it('2. Fails when public market API returns error code', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response('Internal Server Error', { status: 500 }));
    });

    await expect(fetchLiveMarketData()).rejects.toThrow();
  });

  it('3. Fails when Base Sepolia RPC fails', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve(new Response(JSON.stringify({
        lastPrice: '62000.50',
        priceChangePercent: '-1.45',
        highPrice: '63100.00',
        lowPrice: '61500.00',
      }), { status: 200 }));
    });

    (publicClient.getBlockNumber as any).mockRejectedValue(new Error('RPC disconnect'));

    await expect(fetchLiveMarketData()).rejects.toThrow('Base Sepolia RPC stats are temporarily unavailable');
  });

  it('4. Confirms no old mock prices remain in production market-data code', () => {
    const marketDataCodePath = path.resolve(process.cwd(), 'src/lib/market-data.ts');
    const code = fs.readFileSync(marketDataCodePath, 'utf-8');
    
    expect(code).not.toContain('64,250');
    expect(code).not.toContain('64250');
    expect(code).not.toContain('3,480');
    expect(code).not.toContain('3480');
  });
});
