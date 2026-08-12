import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeX402PaymentAndFetch } from '../lib/x402-client';
import { globalPolicyEngine } from '../lib/policy';
import { PAYPILOT_CONFIG } from '../lib/config';

// Mock viem's writeContract to avoid real blockchain calls
vi.mock('viem', async (importOriginal) => {
  const original = await importOriginal<typeof import('viem')>();
  return {
    ...original,
    createWalletClient: vi.fn().mockReturnValue({
      writeContract: vi.fn().mockResolvedValue('0xmock_503_test_tx_hash_555555555555555555555555555555555555'),
    }),
  };
});

// Mock publicClient.waitForTransactionReceipt
vi.mock('../lib/wallet', () => {
  return {
    publicClient: {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: BigInt(987654),
      }),
    },
  };
});

describe('Payment error handling and HTTP 503 audits', () => {
  const originalKey = process.env.AGENT_PRIVATE_KEY;
  const originalEnvRecipient = process.env.PAYPILOT_PAYMENT_RECIPIENT;

  beforeEach(() => {
    process.env.AGENT_PRIVATE_KEY = 'f858c7388b7c4ac7ccdab86c0627704aa8d65e067fe6e1120aad111220242a0e';
    process.env.PAYPILOT_PAYMENT_RECIPIENT = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    PAYPILOT_CONFIG.recipient.address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    PAYPILOT_CONFIG.recipient.isConfigured = true;
  });

  afterEach(() => {
    process.env.AGENT_PRIVATE_KEY = originalKey;
    process.env.PAYPILOT_PAYMENT_RECIPIENT = originalEnvRecipient;
    if (originalEnvRecipient) {
      PAYPILOT_CONFIG.recipient.address = originalEnvRecipient;
    }
  });

  it('1. Settlement is audited as SETTLED even if the server returns HTTP 503 Service Unavailable', async () => {
    // Setup policy to allow
    globalPolicyEngine.updatePolicy({ isPaused: false, maxPerTransactionUSDC: 1.0 });

    const mockSettlementPayload = {
      settled: true,
      scheme: 'exact',
      network: PAYPILOT_CONFIG.chain.caip2,
      chainId: PAYPILOT_CONFIG.chain.chainId,
      asset: PAYPILOT_CONFIG.contracts.usdcBaseSepolia,
      amountUSDC: 0.01,
      payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      txHash: '0xmock_503_test_tx_hash_' + '5'.repeat(36),
      settledAt: new Date().toISOString(),
    };

    const mockSettlementHeader = Buffer.from(JSON.stringify(mockSettlementPayload)).toString('base64');

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      // Step 3 initial GET: returns 402 + PAYMENT-REQUIRED header
      if (!init?.headers || !(init.headers as any)['PAYMENT-SIGNATURE']) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Payment Required' }), {
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': Buffer.from(
              JSON.stringify({
                version: '2.0',
                x402: {
                  version: '2.0',
                  scheme: 'exact',
                  network: PAYPILOT_CONFIG.chain.caip2,
                  chainId: PAYPILOT_CONFIG.chain.chainId,
                  asset: PAYPILOT_CONFIG.contracts.usdcBaseSepolia,
                  amount: '10000',
                  amountUSDC: 0.01,
                  payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                  resource: '/api/paid/market-summary',
                  description: 'BTC & ETH Market Intelligence Summary ($0.01 USDC)',
                },
              })
            ).toString('base64'),
          },
        }));
      }

      // Step 9 retry GET: returns 503 Service Unavailable + PAYMENT-RESPONSE header
      return Promise.resolve(new Response(JSON.stringify({
        success: false,
        error: 'Market data is temporarily unavailable from the public API source.',
      }), {
        status: 503,
        headers: {
          'PAYMENT-RESPONSE': mockSettlementHeader,
        },
      }));
    });

    // Run the protocol handler
    const result = await executeX402PaymentAndFetch(
      '/api/paid/market-summary',
      'task-503-test',
      '0x1111111111111111111111111111111111111111',
      mockFetch as unknown as typeof fetch
    );

    // Assertions
    expect(result.success).toBe(false);
    expect(result.error).toContain('Market data is temporarily unavailable');
    
    // The audit trail MUST preserve settlement proof
    expect(result.auditRecord.status).toBe('SETTLED');
    expect(result.auditRecord.txHash).toBe(mockSettlementPayload.txHash);

    // The execution trace should show both Settlement Confirmed and Resource Retrieval Failed
    const stepTitles = result.trace.map(t => t.title);
    expect(stepTitles).toContain('Settlement Confirmed');
    expect(stepTitles).toContain('Resource Retrieval Failed');
    
    const failedStep = result.trace.find(t => t.title === 'Resource Retrieval Failed');
    expect(failedStep?.status).toBe('FAILED');
    expect(failedStep?.details).toContain('Market data is temporarily unavailable');
  });
});
