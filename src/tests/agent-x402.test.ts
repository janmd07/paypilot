import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/agent/run/route';
import { executeX402PaymentAndFetch, assertBaseSepoliaSafety } from '../lib/x402-client';
import { PAYPILOT_CONFIG } from '../lib/config';
import { globalPolicyEngine } from '../lib/policy';
import { dataStore } from '../lib/storage';
import { X402PaymentTerms, PaymentTransaction } from '../types';
import { handleX402Protection } from '../lib/x402-server';

describe('Phase 4: Real AI Agent & x402 Client Flow Unit Tests', () => {
  const originalEnvRecipient = process.env.PAYPILOT_PAYMENT_RECIPIENT;

  beforeEach(async () => {
    if (dataStore.resetStoreForTesting) {
      await dataStore.resetStoreForTesting();
    }
    process.env.PAYPILOT_PAYMENT_RECIPIENT = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    PAYPILOT_CONFIG.recipient.address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    PAYPILOT_CONFIG.recipient.isConfigured = true;
    globalPolicyEngine.updatePolicy({ isPaused: false, maxPerTransactionUSDC: 1.0, dailyLimitUSDC: 5.0, spentTodayUSDC: 0.0 });
  });

  afterEach(() => {
    process.env.PAYPILOT_PAYMENT_RECIPIENT = originalEnvRecipient;
    if (originalEnvRecipient) {
      PAYPILOT_CONFIG.recipient.address = originalEnvRecipient;
      PAYPILOT_CONFIG.recipient.isConfigured = true;
    } else {
      PAYPILOT_CONFIG.recipient.address = '';
      PAYPILOT_CONFIG.recipient.isConfigured = false;
    }
  });

  it('1. Agent endpoint rejects missing task with HTTP 400 error', async () => {
    const req = new NextRequest('http://localhost:3000/api/agent/run', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe('INVALID_TASK_INPUT');
  });

  it('2. Network safety check throws exception for non-Base-Sepolia network', () => {
    expect(() => assertBaseSepoliaSafety(1, 'eip155:1')).toThrow(/CRITICAL SECURITY FAILURE/);
    expect(() => assertBaseSepoliaSafety(84532, 'eip155:84532')).not.toThrow();
  });

  it('3. Agent rejects payment above policy limit ($5.00 vs $1.00 max cap)', () => {
    const terms: X402PaymentTerms = {
      version: '2.0',
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '5000000',
      amountUSDC: 5.0,
      payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      resource: '/api/paid/market-summary',
      description: 'Test description',
    };

    const decision = globalPolicyEngine.evaluatePayment(terms);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('exceeds max per-payment cap');
  });

  it('4. Agent rejects wrong network identifier', () => {
    const terms: X402PaymentTerms = {
      version: '2.0',
      scheme: 'exact',
      network: 'eip155:1',
      chainId: 1,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '10000',
      amountUSDC: 0.01,
      payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      resource: '/api/paid/market-summary',
      description: 'Test description',
    };

    const decision = globalPolicyEngine.evaluatePayment(terms);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Invalid network identifier');
  });

  it('5. Agent rejects wrong token asset address', () => {
    const terms: X402PaymentTerms = {
      version: '2.0',
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0xFakeTokenAddress000000000000000000000',
      amount: '10000',
      amountUSDC: 0.01,
      payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      resource: '/api/paid/market-summary',
      description: 'Test description',
    };

    const decision = globalPolicyEngine.evaluatePayment(terms);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Invalid token asset address');
  });

  it('6. Agent rejects unconfigured or invalid recipient address', () => {
    const terms: X402PaymentTerms = {
      version: '2.0',
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '10000',
      amountUSDC: 0.01,
      payTo: 'Not configured',
      resource: '/api/paid/market-summary',
      description: 'Test description',
    };

    const decision = globalPolicyEngine.evaluatePayment(terms);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('unconfigured or invalid');
  });

  it('7. Agent rejects payment when autonomous agent is paused by user', () => {
    globalPolicyEngine.updatePolicy({ isPaused: true });

    const terms: X402PaymentTerms = {
      version: '2.0',
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '10000',
      amountUSDC: 0.01,
      payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      resource: '/api/paid/market-summary',
      description: 'Test description',
    };

    const decision = globalPolicyEngine.evaluatePayment(terms);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('currently PAUSED');
  });

  it('8. Failed or rejected payment does NOT increase volume metrics', async () => {
    globalPolicyEngine.updatePolicy({ isPaused: true });

    const initialMetrics = await dataStore.getGrantMetrics();
    const initialVolume = initialMetrics.allTimeTestnetVolumeUSDC;

    const mockFetch = async () =>
      new Response(
        JSON.stringify({ error: 'Payment Required' }),
        {
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': Buffer.from(
              JSON.stringify({
                version: '2.0',
                x402: {
                  version: '2.0',
                  scheme: 'exact',
                  network: 'eip155:84532',
                  chainId: 84532,
                  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                  amount: '10000',
                  amountUSDC: 0.01,
                  payTo: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                  resource: '/api/paid/market-summary',
                  description: 'Test requirement',
                },
              })
            ).toString('base64'),
          },
        }
      );

    const result = await executeX402PaymentAndFetch(
      '/api/paid/market-summary',
      'task-test-paused',
      '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      mockFetch as unknown as typeof fetch
    );

    expect(result.success).toBe(false);
    expect(result.auditRecord.status).toBe('POLICY_REJECTED');

    const updatedMetrics = await dataStore.getGrantMetrics();
    expect(updatedMetrics.allTimeTestnetVolumeUSDC).toBe(initialVolume);
  });

  it('9. Agent rejects payment when recipient matches agent own wallet address', () => {
    const originalKey = process.env.AGENT_PRIVATE_KEY;
    try {
      const testKey = 'f858c7388b7c4ac7ccdab86c0627704aa8d65e067fe6e1120aad111220242a0e';
      process.env.AGENT_PRIVATE_KEY = testKey;
      
      const formattedKey = '0xf858c7388b7c4ac7ccdab86c0627704aa8d65e067fe6e1120aad111220242a0e';
      const { privateKeyToAccount } = require('viem/accounts');
      const derivedAgentAddress = privateKeyToAccount(formattedKey).address;

      const terms: X402PaymentTerms = {
        version: '2.0',
        scheme: 'exact',
        network: 'eip155:84532',
        chainId: 84532,
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        amount: '10000',
        amountUSDC: 0.01,
        payTo: derivedAgentAddress,
        resource: '/api/paid/market-summary',
        description: 'Test self-transfer detection',
      };

      const decision = globalPolicyEngine.evaluatePayment(terms);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Self-transfer safety violation');
    } finally {
      process.env.AGENT_PRIVATE_KEY = originalKey;
    }
  });

  it('10. Replay protection: same txHash submitted twice is rejected', async () => {
    const signaturePayload = {
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      signature: '0xmocksignature',
      txHash: '0xmock_replay_test_' + '1'.repeat(47),
      payerAddress: '0x1111111111111111111111111111111111111111',
    };

    const signatureHeader = Buffer.from(JSON.stringify(signaturePayload)).toString('base64');
    const req1 = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });

    const result1 = await handleX402Protection(req1, '/api/paid/market-summary', 0.01);
    expect(result1.type).toBe('VERIFIED');

    // Submit again!
    const req2 = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });

    const result2 = await handleX402Protection(req2, '/api/paid/market-summary', 0.01);
    expect(result2.type).toBe('CHALLENGE');
    if (result2.type === 'CHALLENGE') {
      expect(result2.response.status).toBe(402);
      const json = await result2.response.json();
      expect(json.code).toBe('REPLAY_ATTACK_PROHIBITED');
    }
  });

  it('11. Idempotency: duplicate txHash cannot increase analytics volume or double count', async () => {
    const initialMetrics = await dataStore.getGrantMetrics();
    const initialVolume = initialMetrics.allTimeTestnetVolumeUSDC;

    const signaturePayload = {
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      signature: '0xmocksignature',
      txHash: '0xmock_idempotency_test_' + '2'.repeat(42),
      payerAddress: '0x1111111111111111111111111111111111111111',
    };

    const signatureHeader = Buffer.from(JSON.stringify(signaturePayload)).toString('base64');
    
    // First verification (Successful)
    const req1 = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });
    await handleX402Protection(req1, '/api/paid/market-summary', 0.01);
    
    const intermediateMetrics = await dataStore.getGrantMetrics();
    expect(intermediateMetrics.allTimeTestnetVolumeUSDC).toBeCloseTo(initialVolume + 0.01, 5);

    // Second verification (Rejected as replay)
    const req2 = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });
    await handleX402Protection(req2, '/api/paid/market-summary', 0.01);

    const finalMetrics = await dataStore.getGrantMetrics();
    // Volume must not increase a second time!
    expect(finalMetrics.allTimeTestnetVolumeUSDC).toBeCloseTo(intermediateMetrics.allTimeTestnetVolumeUSDC, 5);
  });

  it('12. Concurrency: concurrent duplicate settlement attempts are locked and rejected', async () => {
    const signaturePayload = {
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      signature: '0xmocksignature',
      txHash: '0xmock_concurrency_test_' + '3'.repeat(42),
      payerAddress: '0x1111111111111111111111111111111111111111',
    };

    const signatureHeader = Buffer.from(JSON.stringify(signaturePayload)).toString('base64');

    const req1 = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });

    const req2 = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });

    // Run concurrently!
    const [res1, res2] = await Promise.all([
      handleX402Protection(req1, '/api/paid/market-summary', 0.01),
      handleX402Protection(req2, '/api/paid/market-summary', 0.01),
    ]);

    // One must be VERIFIED and the other must be rejected with CONCURRENT_SETTLEMENT_PROHIBITED
    const types = [res1.type, res2.type];
    expect(types).toContain('VERIFIED');
    expect(types).toContain('CHALLENGE');

    const rejectedResult = res1.type === 'CHALLENGE' ? res1 : res2;
    if (rejectedResult.type === 'CHALLENGE') {
      const json = await rejectedResult.response.json();
      expect(json.code).toBe('CONCURRENT_SETTLEMENT_PROHIBITED');
    }
  });

  it('13. Storage isolation: test environment writes only to isolated test file', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const productionDbPath = path.resolve(process.cwd(), 'data', 'paypilot-store.json');
    const testDbPath = path.resolve(process.cwd(), 'data', 'paypilot-store-test.json');
    
    // Read the production db content before adding any transaction
    const prodContentBefore = fs.existsSync(productionDbPath) ? fs.readFileSync(productionDbPath, 'utf-8') : '';
    
    // Add transaction via adapter
    const newTx: PaymentTransaction = {
      id: 'tx-isolation-test-' + Date.now(),
      timestamp: '1:00:00 pm',
      isoTimestamp: new Date().toISOString(),
      serviceName: 'PayPilot Isolation Test API',
      endpoint: '/api/paid/isolation-test',
      amountUSDC: 0.01,
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      txHash: '0xmock_isolation_test_hash_' + '4'.repeat(38),
      network: 'eip155:84532',
      chainId: 84532,
      status: 'SUCCESS',
      isTestnet: true,
    };
    
    await dataStore.addTransaction(newTx);
    
    // Read the production db content after
    const prodContentAfter = fs.existsSync(productionDbPath) ? fs.readFileSync(productionDbPath, 'utf-8') : '';
    
    // Production content must not have changed at all!
    expect(prodContentBefore).toBe(prodContentAfter);
    
    // Instead, the transaction must be present in the test database!
    expect(fs.existsSync(testDbPath)).toBe(true);
    const testContent = fs.readFileSync(testDbPath, 'utf-8');
    expect(testContent).toContain(newTx.id);
  });

  it('14. ERC-8021: Attribution.toDataSuffix produces the exact Builder Code suffix for bc_016f40ud', () => {
    // Verifies the official ox/erc8021 API produces the exact suffix from the
    // Base Builder registration page, so the walletClient dataSuffix is correct.
    const { Attribution } = require('ox/erc8021');
    const suffix = Attribution.toDataSuffix({ codes: ['bc_016f40ud'] });

    // Must exactly match the encoded suffix supplied by Base Builder
    expect(suffix).toBe('0x62635f30313666343075640b0080218021802180218021802180218021');

    // Sanity: must begin with hex-encoded 'bc_016f40ud' (0x62635f30313666343075640b)
    expect(suffix.startsWith('0x62635f30313666343075640b')).toBe(true);

    // Sanity: must end with the canonical ERC-8021 terminator
    // (8 repetitions of 0x8021 = 0x80218021802180218021802180218021)
    expect(suffix.endsWith('80218021802180218021802180218021')).toBe(true);
  });
});



