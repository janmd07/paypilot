import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore } from '../lib/storage';
import { globalPolicyEngine } from '../lib/policy';
import { PaymentTransaction } from '../types';
import fs from 'fs';
import path from 'path';

describe('Spending Guard Persistence & Policy Synchronization Tests', () => {
  beforeEach(async () => {
    if (dataStore.resetStoreForTesting) {
      await dataStore.resetStoreForTesting();
    }
  });

  it('1. Calculates spentTodayUSDC dynamically from successful transactions of the current UTC day', async () => {
    const todayIso = new Date().toISOString(); // Current UTC day
    
    const tx1: PaymentTransaction = {
      id: 'tx-1',
      timestamp: '12:00:00 PM',
      isoTimestamp: todayIso,
      amountUSDC: 0.01,
      status: 'SUCCESS',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_1',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    const tx2: PaymentTransaction = {
      id: 'tx-2',
      timestamp: '12:05:00 PM',
      isoTimestamp: todayIso,
      amountUSDC: 0.02,
      status: 'SUCCESS',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_2',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    // Add transactions
    await dataStore.addTransaction(tx1);
    await dataStore.addTransaction(tx2);

    const policy = await dataStore.getPolicy();
    expect(policy.spentTodayUSDC).toBe(0.03);
    expect(policy.lastResetTimestamp).toBe(todayIso.split('T')[0]);
  });

  it('2. Excludes REJECTED and FAILED transactions from calculations', async () => {
    const todayIso = new Date().toISOString();
    
    const txSuccess: PaymentTransaction = {
      id: 'tx-success',
      timestamp: '12:00:00 PM',
      isoTimestamp: todayIso,
      amountUSDC: 0.05,
      status: 'SUCCESS',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_success',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    const txRejected: PaymentTransaction = {
      id: 'tx-rejected',
      timestamp: '12:01:00 PM',
      isoTimestamp: todayIso,
      amountUSDC: 0.10,
      status: 'REJECTED',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_rejected',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    const txFailed: PaymentTransaction = {
      id: 'tx-failed',
      timestamp: '12:02:00 PM',
      isoTimestamp: todayIso,
      amountUSDC: 0.20,
      status: 'FAILED',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_failed',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    await dataStore.addTransaction(txSuccess);
    await dataStore.addTransaction(txRejected);
    await dataStore.addTransaction(txFailed);

    const policy = await dataStore.getPolicy();
    expect(policy.spentTodayUSDC).toBe(0.05); // Excludes 0.10 and 0.20
  });

  it('3. Excludes transactions from previous UTC days', async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const txToday: PaymentTransaction = {
      id: 'tx-today',
      timestamp: '12:00:00 PM',
      isoTimestamp: today.toISOString(),
      amountUSDC: 0.04,
      status: 'SUCCESS',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_today',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    const txYesterday: PaymentTransaction = {
      id: 'tx-yesterday',
      timestamp: '12:00:00 PM',
      isoTimestamp: yesterday.toISOString(),
      amountUSDC: 0.50,
      status: 'SUCCESS',
      network: 'eip155:84532',
      chainId: 84532,
      txHash: '0xmock_hash_yesterday',
      recipientAddress: '0xrecipient',
      isTestnet: true,
      serviceName: 'PayPilot Market Summary API',
      endpoint: '/api/paid/market-summary',
    };

    await dataStore.addTransaction(txToday);
    await dataStore.addTransaction(txYesterday);

    const policy = await dataStore.getPolicy();
    expect(policy.spentTodayUSDC).toBe(0.04); // Excludes yesterday's 0.50
  });

  it('4. Asserts that reading policy does not modify the production file', async () => {
    const isTest = process.env.NODE_ENV === 'test';
    expect(isTest).toBe(true);

    const testDbPath = path.resolve(process.cwd(), 'data', 'paypilot-store-test.json');
    const productionDbPath = path.resolve(process.cwd(), 'data', 'paypilot-store.json');

    const prodExists = fs.existsSync(productionDbPath);
    const prodContentBefore = prodExists ? fs.readFileSync(productionDbPath, 'utf-8') : '';

    // Trigger policy read (which computes spentTodayUSDC)
    await dataStore.getPolicy();

    const prodContentAfter = prodExists ? fs.readFileSync(productionDbPath, 'utf-8') : '';
    expect(prodContentBefore).toBe(prodContentAfter);
  });
});
