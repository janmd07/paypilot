export interface MarketSummaryResource {
  success: boolean;
  service?: string;
  network?: string;
  chainId?: number;
  timestamp?: string;
  price?: string;
  data?: {
    btc?: {
      symbol: string;
      price: string;
      change24h: string;
      high24h: string;
      low24h: string;
    };
    eth?: {
      symbol: string;
      price: string;
      change24h: string;
      high24h: string;
      low24h: string;
    };
    baseSepoliaStats?: {
      activeSubmissions?: number;
      averageGasGwei?: string;
      usdcTransferSpeed?: string;
      blockNumber?: number;
    };
    summary?: string;
  };
}

function isPresent(val: string | number | undefined | null): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
}

/**
 * Local deterministic synthesizer that parses user prompts and returns structured
 * facts from the paid resource without calling any AI APIs.
 */
export function synthesizeMarketDataLocally(userTask: string, marketData: MarketSummaryResource): string {
  const task = userTask.toLowerCase().trim();
  const data = marketData?.data;

  if (!marketData || !data) {
    return 'The requested market intelligence data is currently unavailable.';
  }

  const btc = data.btc;
  const eth = data.eth;
  const stats = data.baseSepoliaStats;
  const summaryText = data.summary;

  // Intent Matchers
  const isBtcOnly = (task.includes('btc') || task.includes('bitcoin')) && !(task.includes('eth') || task.includes('ethereum') || task.includes('ether'));
  const isEthOnly = (task.includes('eth') || task.includes('ethereum') || task.includes('ether')) && !(task.includes('btc') || task.includes('bitcoin'));
  const isMomentum = task.includes('bullish') || task.includes('bearish') || task.includes('momentum') || task.includes('trend') || task.includes('direction') || task.includes('movement');
  const isHighLow = task.includes('high') || task.includes('low') || task.includes('peak') || task.includes('trough') || task.includes('range') || task.includes('max') || task.includes('min') || task.includes('highest') || task.includes('lowest');
  const isNetwork = task.includes('sepolia') || task.includes('gas') || task.includes('network') || task.includes('speed') || task.includes('latency') || task.includes('active') || task.includes('submission') || task.includes('base');
  const isSimple = task.includes('simple') || task.includes('non-technical') || task.includes('eli5') || task.includes('easy') || task.includes('explain like') || task.includes('plain english') || task.includes('child');
  const isConcise = task.includes('concise') || task.includes('short') || task.includes('brief') || task.includes('quick');

  // Format helpers with "unavailable" fallback
  const getBtcPrice = () => isPresent(btc?.price) ? `$${btc!.price}` : 'BTC price is unavailable';
  const getBtcChange = () => isPresent(btc?.change24h) ? btc!.change24h : 'BTC 24h change is unavailable';
  const getBtcHigh = () => isPresent(btc?.high24h) ? `$${btc!.high24h}` : 'BTC 24h high is unavailable';
  const getBtcLow = () => isPresent(btc?.low24h) ? `$${btc!.low24h}` : 'BTC 24h low is unavailable';

  const getEthPrice = () => isPresent(eth?.price) ? `$${eth!.price}` : 'ETH price is unavailable';
  const getEthChange = () => isPresent(eth?.change24h) ? eth!.change24h : 'ETH 24h change is unavailable';
  const getEthHigh = () => isPresent(eth?.high24h) ? `$${eth!.high24h}` : 'ETH 24h high is unavailable';
  const getEthLow = () => isPresent(eth?.low24h) ? `$${eth!.low24h}` : 'ETH 24h low is unavailable';

  const getGas = () => isPresent(stats?.averageGasGwei) ? `${stats!.averageGasGwei} Gwei` : 'gas price is unavailable';
  const getActive = () => isPresent(stats?.activeSubmissions) ? `${stats!.activeSubmissions}` : 'active submissions count is unavailable';
  const getActiveText = () => isPresent(stats?.activeSubmissions) ? `${stats!.activeSubmissions} active submissions` : 'active submissions count is unavailable';
  const getSpeed = () => isPresent(stats?.usdcTransferSpeed) ? stats!.usdcTransferSpeed : 'USDC transfer speed is unavailable';
  const getBlockNumber = () => isPresent(stats?.blockNumber) ? `${stats!.blockNumber}` : 'block number is unavailable';

  const getSummary = () => isPresent(summaryText) ? summaryText! : 'Market summary text is unavailable';

  // 1. BTC-only request
  if (isBtcOnly) {
    return [
      'BTC Price Information (Local Synthesis):',
      `- Asset: ${btc?.symbol ?? 'BTC/USD'}`,
      `- Current Price: ${getBtcPrice()} (24h Change: ${getBtcChange()})`,
      `- 24h Range: High ${getBtcHigh()}, Low ${getBtcLow()}`,
      `Source facts: Retrieved from PayPilot Market Summary at ${marketData.timestamp ?? 'unknown time'}.`
    ].join('\n');
  }

  // 2. ETH-only request
  if (isEthOnly) {
    return [
      'ETH Price Information (Local Synthesis):',
      `- Asset: ${eth?.symbol ?? 'ETH/USD'}`,
      `- Current Price: ${getEthPrice()} (24h Change: ${getEthChange()})`,
      `- 24h Range: High ${getEthHigh()}, Low ${getEthLow()}`,
      `Source facts: Retrieved from PayPilot Market Summary at ${marketData.timestamp ?? 'unknown time'}.`
    ].join('\n');
  }

  // 3. High/low range request
  if (isHighLow) {
    return [
      '24h Asset Ranges (Local Synthesis):',
      `- BTC/USD Range: High ${getBtcHigh()}, Low ${getBtcLow()}`,
      `- ETH/USD Range: High ${getEthHigh()}, Low ${getEthLow()}`,
      `Source facts: Retrieved from PayPilot Market Summary at ${marketData.timestamp ?? 'unknown time'}.`
    ].join('\n');
  }

  // 4. Momentum / Trend request
  if (isMomentum) {
    return [
      'Market Momentum & Trends (Local Synthesis):',
      `- Trend Overview: ${getSummary()}`,
      `- BTC 24h Change: ${getBtcChange()}`,
      `- ETH 24h Change: ${getEthChange()}`,
      `Source facts: Retrieved from PayPilot Market Summary at ${marketData.timestamp ?? 'unknown time'}.`
    ].join('\n');
  }

  // 5. Base Sepolia / Network request
  if (isNetwork) {
    return [
      'Base Sepolia Network Status (Local Synthesis):',
      `- Chain ID: ${marketData.chainId ?? 'unavailable'}`,
      `- Current Block: ${getBlockNumber()}`,
      `- Active Submissions: ${getActive()}`,
      `- Average Gas: ${getGas()}`,
      `- USDC Transfer Speed: ${getSpeed()}`,
      `Source facts: Retrieved from PayPilot Network Statistics at ${marketData.timestamp ?? 'unknown time'}.`
    ].join('\n');
  }

  // 6. Simple explanation request
  if (isSimple) {
    return [
      'Simple Explanation (Local Synthesis):',
      `Currently, Bitcoin (BTC) is trading at ${getBtcPrice()} and Ethereum (ETH) is trading at ${getEthPrice()}.`,
      `The general market trend is described as: "${getSummary()}".`,
      `On the Base Sepolia network, transactions are taking ${getSpeed()} with an average gas cost of ${getGas()}.`,
      'Note: This explanation is simplified and derived directly from underlying service statistics.'
    ].join('\n');
  }

  // 7. Concise/brief request
  if (isConcise) {
    return [
      'Concise Market Summary (Local Synthesis):',
      `BTC: ${getBtcPrice()} (${getBtcChange()}) | ETH: ${getEthPrice()} (${getEthChange()})`,
      `Network Gas: ${getGas()} | Status: ${getSummary()}`
    ].join('\n');
  }

  // 8. General summary (Default)
  return [
    'Market Intelligence Report (Local Synthesis):',
    `- BTC/USD: ${getBtcPrice()} (24h change: ${getBtcChange()}). Range: ${getBtcLow()} to ${getBtcHigh()}`,
    `- ETH/USD: ${getEthPrice()} (24h change: ${getEthChange()}). Range: ${getEthLow()} to ${getEthHigh()}`,
    `- Base Sepolia Gas: ${getGas()} (${getActiveText()})`,
    `- Summary: ${getSummary()}`,
    `Source facts: Retrieved from PayPilot Market Summary at ${marketData.timestamp ?? 'unknown timestamp'}.`
  ].join('\n');
}
