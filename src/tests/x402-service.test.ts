import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { handleX402Protection, decodeBase64Header, validateNetworkSafety } from '../lib/x402-server';
import { PAYPILOT_CONFIG } from '../lib/config';
import { dataStore } from '../lib/storage';

describe('Phase 3: Official x402 V2 Paid Service Unit Tests', () => {
  const originalEnvRecipient = process.env.PAYPILOT_PAYMENT_RECIPIENT;

  beforeEach(async () => {
    if (dataStore.resetStoreForTesting) {
      await dataStore.resetStoreForTesting();
    }
    process.env.PAYPILOT_PAYMENT_RECIPIENT = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    PAYPILOT_CONFIG.recipient.address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    PAYPILOT_CONFIG.recipient.isConfigured = true;
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

  it('1. Missing PAYPILOT_PAYMENT_RECIPIENT fails safely with HTTP 500 error', async () => {
    PAYPILOT_CONFIG.recipient.address = '';
    PAYPILOT_CONFIG.recipient.isConfigured = false;
    process.env.PAYPILOT_PAYMENT_RECIPIENT = '';

    const req = new NextRequest('http://localhost:3000/api/paid/market-summary');
    const result = await handleX402Protection(req, '/api/paid/market-summary', 0.01);

    expect(result.type).toBe('CONFIG_ERROR');
    if (result.type === 'CONFIG_ERROR') {
      expect(result.response.status).toBe(500);
      const json = await result.response.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('PAYMENT_RECIPIENT_UNCONFIGURED');
    }
  });

  it('2. Network Safety Check rejects non-Base-Sepolia network configuration', () => {
    expect(() => validateNetworkSafety('eip155:1', 1)).toThrow(/CRITICAL SECURITY FAILURE/);
    expect(() => validateNetworkSafety('eip155:84532', 84532)).not.toThrow();
  });

  it('3. Unpaid GET request returns HTTP 402 Payment Required', async () => {
    const req = new NextRequest('http://localhost:3000/api/paid/market-summary');
    const result = await handleX402Protection(req, '/api/paid/market-summary', 0.01);

    expect(result.type).toBe('CHALLENGE');
    if (result.type === 'CHALLENGE') {
      expect(result.response.status).toBe(402);
    }
  });

  it('4. HTTP 402 response contains official PAYMENT-REQUIRED header', async () => {
    const req = new NextRequest('http://localhost:3000/api/paid/market-summary');
    const result = await handleX402Protection(req, '/api/paid/market-summary', 0.01);

    if (result.type === 'CHALLENGE') {
      const paymentRequiredHeader = result.response.headers.get('PAYMENT-REQUIRED');
      expect(paymentRequiredHeader).toBeTruthy();

      const decoded = decodeBase64Header(paymentRequiredHeader!) as { version: string; x402: Record<string, unknown> };
      expect(decoded.version).toBe('2.0');
      expect(decoded.x402.network).toBe('eip155:84532');
      expect(decoded.x402.chainId).toBe(84532);
      expect(decoded.x402.asset).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
      expect(decoded.x402.amount).toBe('10000'); // 0.01 USDC
      expect(decoded.x402.payTo).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    }
  });

  it('5. Invalid PAYMENT-SIGNATURE header is rejected', async () => {
    const invalidHeader = Buffer.from(JSON.stringify({ invalid: true })).toString('base64');
    const req = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': invalidHeader },
    });

    const result = await handleX402Protection(req, '/api/paid/market-summary', 0.01);
    expect(result.type).toBe('CHALLENGE');
    if (result.type === 'CHALLENGE') {
      expect(result.response.status).toBe(400);
    }
  });

  it('6. Valid PAYMENT-SIGNATURE header yields VERIFIED result with PAYMENT-RESPONSE', async () => {
    const validHeaderPayload = {
      scheme: 'exact',
      network: 'eip155:84532',
      chainId: 84532,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      signature: '0xmocksignature',
      txHash: '0xmock111111111111111111111111111111111111111111111111111111111111',
      payerAddress: '0x1111111111111111111111111111111111111111',
    };

    const signatureHeader = Buffer.from(JSON.stringify(validHeaderPayload)).toString('base64');
    const req = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });

    const result = await handleX402Protection(req, '/api/paid/market-summary', 0.01);
    expect(result.type).toBe('VERIFIED');

    if (result.type === 'VERIFIED') {
      expect(result.settlementHeader).toBeTruthy();
      const decodedSettlement = decodeBase64Header(result.settlementHeader) as Record<string, unknown>;
      expect(decodedSettlement.settled).toBe(true);
      expect(decodedSettlement.network).toBe('eip155:84532');
      expect(decodedSettlement.amountUSDC).toBe(0.01);
    }
  });

  it('7. Successful settlement increments recorded analytics volume', async () => {
    const initialMetrics = await dataStore.getGrantMetrics();
    const initialVolume = initialMetrics.allTimeTestnetVolumeUSDC;

    const validHeaderPayload = {
      scheme: 'exact',
      network: 'eip155:84532',
      signature: '0xmocksignature',
      txHash: '0xmock222222222222222222222222222222222222222222222222222222222222',
    };

    const signatureHeader = Buffer.from(JSON.stringify(validHeaderPayload)).toString('base64');
    const req = new NextRequest('http://localhost:3000/api/paid/market-summary', {
      headers: { 'PAYMENT-SIGNATURE': signatureHeader },
    });

    await handleX402Protection(req, '/api/paid/market-summary', 0.01);

    const updatedMetrics = await dataStore.getGrantMetrics();
    expect(updatedMetrics.allTimeTestnetVolumeUSDC).toBeGreaterThanOrEqual(initialVolume + 0.01);
  });
});
