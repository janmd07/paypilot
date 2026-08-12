import { describe, it, expect } from 'vitest';
import { synthesizeMarketDataLocally, MarketSummaryResource } from '../lib/synthesis';

describe('Local Deterministic Synthesizer Tests', () => {
  const mockMarketData: MarketSummaryResource = {
    success: true,
    chainId: 84532,
    timestamp: '2026-08-12T12:00:00Z',
    data: {
      btc: {
        symbol: 'BTC/USD',
        price: '64,250.00',
        change24h: '+2.4%',
        high24h: '65,100.00',
        low24h: '62,800.00',
      },
      eth: {
        symbol: 'ETH/USD',
        price: '3,480.50',
        change24h: '+3.1%',
        high24h: '3,540.00',
        low24h: '3,390.00',
      },
      baseSepoliaStats: {
        activeSubmissions: 1420,
        averageGasGwei: '0.001',
        usdcTransferSpeed: '< 2s',
        blockNumber: 12345678,
      },
      summary: 'Bullish momentum detected across major assets on Base Sepolia. High liquidity and low gas latency observed.',
    },
  };

  it('1. BTC + ETH summary (Default)', () => {
    const prompt = 'Please give me the market overview.';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('Market Intelligence Report (Local Synthesis):');
    expect(response).toContain('BTC/USD: $64,250.00 (24h change: +2.4%)');
    expect(response).toContain('ETH/USD: $3,480.50 (24h change: +3.1%)');
    expect(response).toContain('Base Sepolia Gas: 0.001 Gwei (1420 active submissions)');
    expect(response).toContain('Summary: Bullish momentum detected across major assets on Base Sepolia.');
  });

  it('2. BTC-only request', () => {
    const prompt = 'Show me the BTC price metrics and range';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('BTC Price Information (Local Synthesis):');
    expect(response).toContain('Current Price: $64,250.00 (24h Change: +2.4%)');
    expect(response).toContain('24h Range: High $65,100.00, Low $62,800.00');
    expect(response).not.toContain('ETH Price Information');
    expect(response).not.toContain('ETH/USD');
  });

  it('3. ETH-only request', () => {
    const prompt = 'What is the current ethereum stats?';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('ETH Price Information (Local Synthesis):');
    expect(response).toContain('Current Price: $3,480.50 (24h Change: +3.1%)');
    expect(response).toContain('24h Range: High $3,540.00, Low $3,390.00');
    expect(response).not.toContain('BTC Price Information');
    expect(response).not.toContain('BTC/USD');
  });

  it('4. Base Sepolia/gas request', () => {
    const prompt = 'Check the network gas fees and average transfer speed on Base Sepolia';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('Base Sepolia Network Status (Local Synthesis):');
    expect(response).toContain('Chain ID: 84532');
    expect(response).toContain('Current Block: 12345678');
    expect(response).toContain('Active Submissions: 1420');
    expect(response).toContain('Average Gas: 0.001 Gwei');
    expect(response).toContain('USDC Transfer Speed: < 2s');
  });

  it('5. Simple-language request', () => {
    const prompt = 'Explain what is happening in simple terms';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('Simple Explanation (Local Synthesis):');
    expect(response).toContain('Bitcoin (BTC) is trading at $64,250.00');
    expect(response).toContain('Ethereum (ETH) is trading at $3,480.50');
    expect(response).toContain('general market trend is described as: "Bullish momentum detected');
    expect(response).toContain('transactions are taking < 2s with an average gas cost of 0.001 Gwei.');
  });

  it('6. High/low request', () => {
    const prompt = 'What are the peaks and lows for the day?';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('24h Asset Ranges (Local Synthesis):');
    expect(response).toContain('BTC/USD Range: High $65,100.00, Low $62,800.00');
    expect(response).toContain('ETH/USD Range: High $3,540.00, Low $3,390.00');
  });

  it('7. Concise summary request', () => {
    const prompt = 'Give me a quick brief';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('Concise Market Summary (Local Synthesis):');
    expect(response).toContain('BTC: $64,250.00 (+2.4%) | ETH: $3,480.50 (+3.1%)');
    expect(response).toContain('Network Gas: 0.001 Gwei | Status: Bullish momentum detected');
  });

  it('8. Missing fields fallback', () => {
    const incompleteData: MarketSummaryResource = {
      success: true,
      timestamp: '2026-08-12T12:00:00Z',
      data: {
        btc: {
          symbol: 'BTC/USD',
          price: '',
          change24h: '',
          high24h: '',
          low24h: '',
        },
      },
    };

    const prompt = 'Give me BTC price and ETH stats';
    const response = synthesizeMarketDataLocally(prompt, incompleteData);

    expect(response).toContain('BTC/USD: BTC price is unavailable (24h change: BTC 24h change is unavailable)');
    expect(response).toContain('ETH/USD: ETH price is unavailable');
    expect(response).toContain('Base Sepolia Gas: gas price is unavailable');
  });

  it('9. Risk assessment request', () => {
    const prompt = 'Is this transaction safe? run a risk assessment';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData);

    expect(response).toContain('PayPilot Risk Assessment (Local Synthesis):');
    expect(response).toContain('Overall Status: SECURE & COMPLIANT');
    expect(response).toContain('Hardcoded exclusively to Base Sepolia Testnet');
    expect(response).not.toContain('BTC/USD Range');
  });

  it('10. Spending policy request', () => {
    const mockPolicy = {
      maxPerTransactionUSDC: 2.5,
      dailyLimitUSDC: 10.0,
      spentTodayUSDC: 1.5,
      allowlistServices: ['*'],
      requireApprovalAboveUSDC: 5.0,
      isPaused: false,
      lastResetTimestamp: '2026-08-12',
    };

    const prompt = 'What is my spending cap and current allowance?';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData, undefined, mockPolicy);

    expect(response).toContain('Spending Policy Details (Local Synthesis):');
    expect(response).toContain('Max Per Transaction: $2.50 USDC');
    expect(response).toContain('Daily Cap: $10.00 USDC');
    expect(response).toContain('Spent Today: $1.50 USDC');
    expect(response).toContain('Remaining Daily Allowance: $8.50 USDC');
    expect(response).toContain('Requires manual user authorization above $5.00 USDC');
    expect(response).toContain('Policy Engine Status: ACTIVE');
  });

  it('11. Payment receipt request', () => {
    const mockAudit = {
      id: 'audit-123',
      taskId: 'task-456',
      timestamp: '6:00:00 pm',
      isoTimestamp: '2026-08-12T12:30:00.000Z',
      amountUSDC: 0.01,
      asset: 'USDC',
      network: 'eip155:84532',
      chainId: 84532,
      recipient: '0xrecipientAddressHere',
      service: 'Paid API',
      endpoint: '/api/paid/market-summary',
      status: 'SETTLED' as const,
      txHash: '0xtxHashHere',
    };

    const prompt = 'Show me the payment receipt and invoice hash';
    const response = synthesizeMarketDataLocally(prompt, mockMarketData, mockAudit);

    expect(response).toContain('Payment Audit Receipt (Local Synthesis):');
    expect(response).toContain('Audit Record ID: audit-123');
    expect(response).toContain('Task ID Reference: task-456');
    expect(response).toContain('Status: SETTLED');
    expect(response).toContain('Amount Sended: $0.01 USDC');
    expect(response).toContain('Recipient Address: 0xrecipientAddressHere');
    expect(response).toContain('Settlement TxHash: 0xtxHashHere');
  });

  it('12. Spending policy request with missing/undefined properties', () => {
    const prompt = 'Show me my spending limits policy';
    const incompletePolicy = {
      allowlistServices: ['*'],
      lastResetTimestamp: '2026-08-12',
    } as any;

    const response = synthesizeMarketDataLocally(prompt, mockMarketData, undefined, incompletePolicy);

    expect(response).toContain('Spending Policy Details (Local Synthesis):');
    expect(response).toContain('Max Per Transaction: not available');
    expect(response).toContain('Daily Cap: not available');
    expect(response).toContain('Spent Today: not available');
    expect(response).toContain('Remaining Daily Allowance: not available');
    expect(response).toContain('Approval Threshold: not available');
    expect(response).toContain('Policy Engine Status: not available');
  });
});
