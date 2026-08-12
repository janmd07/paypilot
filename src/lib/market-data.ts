import { publicClient } from './wallet';
import { MarketSummaryResource } from './synthesis';

export async function fetchLiveMarketData(): Promise<Required<MarketSummaryResource>['data']> {
  const [btcRes, ethRes] = await Promise.all([
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { cache: 'no-store' }),
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { cache: 'no-store' }),
  ]);

  if (!btcRes.ok || !ethRes.ok) {
    throw new Error(`Failed to fetch tickers: BTC status ${btcRes.status}, ETH status ${ethRes.status}`);
  }

  const btcData = await btcRes.json();
  const ethData = await ethRes.json();

  if (!btcData.lastPrice || !btcData.priceChangePercent || !btcData.highPrice || !btcData.lowPrice ||
      !ethData.lastPrice || !ethData.priceChangePercent || !ethData.highPrice || !ethData.lowPrice) {
    throw new Error('Public market API response missing required ticker fields');
  }

  // Fetch Base Sepolia RPC stats
  let blockNumber: number | undefined = undefined;
  let averageGasGwei: string | undefined = undefined;

  try {
    const [block, gasPrice] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getGasPrice(),
    ]);
    blockNumber = Number(block);
    averageGasGwei = (Number(gasPrice) / 1e9).toFixed(6); // Convert wei to Gwei
  } catch (rpcErr) {
    console.error('Base Sepolia RPC query failed:', rpcErr);
    throw new Error('Base Sepolia RPC stats are temporarily unavailable');
  }

  const formatPrice = (p: string) => {
    const val = parseFloat(p);
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (p: string) => {
    const val = parseFloat(p);
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  const btcPercent = parseFloat(btcData.priceChangePercent);
  const ethPercent = parseFloat(ethData.priceChangePercent);
  const momentum = (btcPercent > 0 && ethPercent > 0)
    ? 'positive'
    : (btcPercent < 0 && ethPercent < 0)
    ? 'negative'
    : 'mixed';

  const summary = `Market data fetched from public tickers. Overall 24h momentum is ${momentum}. BTC/USD is trading at $${formatPrice(btcData.lastPrice)} (${formatPercent(btcData.priceChangePercent)}) and ETH/USD is at $${formatPrice(ethData.lastPrice)} (${formatPercent(ethData.priceChangePercent)}).`;

  return {
    btc: {
      symbol: 'BTC/USD',
      price: formatPrice(btcData.lastPrice),
      change24h: formatPercent(btcData.priceChangePercent),
      high24h: formatPrice(btcData.highPrice),
      low24h: formatPrice(btcData.lowPrice),
    },
    eth: {
      symbol: 'ETH/USD',
      price: formatPrice(ethData.lastPrice),
      change24h: formatPercent(ethData.priceChangePercent),
      high24h: formatPrice(ethData.highPrice),
      low24h: formatPrice(ethData.lowPrice),
    },
    baseSepoliaStats: {
      averageGasGwei,
      blockNumber,
    },
    summary,
  };
}
