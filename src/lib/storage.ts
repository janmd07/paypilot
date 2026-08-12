import fs from 'fs';
import path from 'path';
import { SpendingPolicy, PaymentTransaction, GrantEvidenceMetrics, IPayPilotStorage } from '@/types';
import { PAYPILOT_CONFIG } from './config';

interface PayPilotDataStore {
  policy: SpendingPolicy;
  transactions: PaymentTransaction[];
  uniqueUsers: Array<{ address: string; onboardedAt: string }>;
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
function getDataFilePath(): string {
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  return path.join(DATA_DIR, isTest ? 'paypilot-store-test.json' : 'paypilot-store.json');
}

const defaultStore: PayPilotDataStore = {
  policy: PAYPILOT_CONFIG.defaultPolicy,
  transactions: [], // ZERO synthetic or fake transactions
  uniqueUsers: [],
  lastUpdated: new Date().toISOString(),
};

function ensureDataDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export class LocalStorageAdapter implements IPayPilotStorage {
  private readStore(): PayPilotDataStore {
    try {
      ensureDataDirectoryExists();
      const filePath = getDataFilePath();
      if (!fs.existsSync(filePath)) {
        this.writeStore(defaultStore);
        return defaultStore;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as PayPilotDataStore;
    } catch (error) {
      console.error('Error reading PayPilot data store:', error);
      return defaultStore;
    }
  }

  private writeStore(store: PayPilotDataStore): void {
    try {
      ensureDataDirectoryExists();
      const filePath = getDataFilePath();
      store.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing PayPilot data store:', error);
    }
  }

  public async getPolicy(): Promise<SpendingPolicy> {
    const store = this.readStore();
    
    // Calculate spentTodayUSDC dynamically from successful transactions of the current UTC day
    const todayStr = new Date().toISOString().split('T')[0];
    const spentToday = store.transactions
      .filter((tx) => {
        if (tx.status !== 'SUCCESS') return false;
        if (!tx.isoTimestamp) return false;
        const txDateStr = new Date(tx.isoTimestamp).toISOString().split('T')[0];
        return txDateStr === todayStr;
      })
      .reduce((sum, tx) => sum + (tx.amountUSDC || 0), 0);

    return {
      ...store.policy,
      spentTodayUSDC: parseFloat(spentToday.toFixed(4)),
      lastResetTimestamp: todayStr,
    };
  }

  public async savePolicy(newPolicy: Partial<SpendingPolicy>): Promise<SpendingPolicy> {
    const store = this.readStore();
    // Exclude spentTodayUSDC from persisted configuration since it is calculated dynamically
    const { spentTodayUSDC, ...persistedPolicy } = newPolicy;
    store.policy = { ...store.policy, ...persistedPolicy };
    this.writeStore(store);
    return this.getPolicy();
  }

  public async getTransactions(): Promise<PaymentTransaction[]> {
    const store = this.readStore();
    return store.transactions;
  }

  public async addTransaction(tx: PaymentTransaction): Promise<PaymentTransaction[]> {
    const store = this.readStore();
    if (tx.txHash && tx.status === 'SUCCESS') {
      const exists = store.transactions.some(
        (t) => t.txHash.toLowerCase() === tx.txHash.toLowerCase() && t.status === 'SUCCESS'
      );
      if (exists) {
        throw new Error(`Duplicate transaction: Transaction ${tx.txHash} has already been settled.`);
      }
    }
    store.transactions = [tx, ...store.transactions];
    this.writeStore(store);
    return store.transactions;
  }

  public async recordUserOnboarding(walletAddress: string): Promise<number> {
    if (!walletAddress) return this.readStore().uniqueUsers.length;
    const store = this.readStore();
    const addressLower = walletAddress.toLowerCase();
    const existing = store.uniqueUsers.find((u) => u.address === addressLower);
    if (!existing) {
      store.uniqueUsers.push({
        address: addressLower,
        onboardedAt: new Date().toISOString(),
      });
      this.writeStore(store);
    }
    return store.uniqueUsers.length;
  }

  public async getGrantMetrics(): Promise<GrantEvidenceMetrics> {
    const store = this.readStore();
    const now = new Date();
    const nowMs = now.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const thirtyDaysMs = 30 * oneDayMs;

    const successfulTxs = store.transactions.filter((t) => t.status === 'SUCCESS');
    const rejectedTxs = store.transactions.filter((t) => t.status === 'REJECTED');
    const failedTxs = store.transactions.filter((t) => t.status === 'FAILED');

    // DAU Calculation: Unique onboarded wallets with qualifying activity in last 24 hours
    const dauWallets = new Set<string>();
    store.transactions.forEach((tx) => {
      if (tx.userAddress && tx.isoTimestamp) {
        const txTime = new Date(tx.isoTimestamp).getTime();
        if (nowMs - txTime <= oneDayMs) {
          dauWallets.add(tx.userAddress.toLowerCase());
        }
      }
    });
    // Add users onboarded within 24h
    store.uniqueUsers.forEach((u) => {
      const uTime = new Date(u.onboardedAt).getTime();
      if (nowMs - uTime <= oneDayMs) {
        dauWallets.add(u.address);
      }
    });

    // WAU Calculation: Unique onboarded wallets with qualifying activity in last 7 days
    const wauWallets = new Set<string>();
    store.transactions.forEach((tx) => {
      if (tx.userAddress && tx.isoTimestamp) {
        const txTime = new Date(tx.isoTimestamp).getTime();
        if (nowMs - txTime <= sevenDaysMs) {
          wauWallets.add(tx.userAddress.toLowerCase());
        }
      }
    });
    store.uniqueUsers.forEach((u) => {
      const uTime = new Date(u.onboardedAt).getTime();
      if (nowMs - uTime <= sevenDaysMs) {
        wauWallets.add(u.address);
      }
    });

    // Volume calculations (verified successful payments only)
    const allTimeVolume = successfulTxs.reduce((acc, t) => acc + (t.amountUSDC || 0), 0);

    const last30DaysVolume = successfulTxs.reduce((acc, t) => {
      if (t.isoTimestamp) {
        const txTime = new Date(t.isoTimestamp).getTime();
        if (nowMs - txTime <= thirtyDaysMs) {
          return acc + (t.amountUSDC || 0);
        }
      }
      return acc + (t.amountUSDC || 0);
    }, 0);

    return {
      allTimeUsersOnboarded: store.uniqueUsers.length,
      dau: dauWallets.size,
      wau: wauWallets.size,
      totalTaskCount: store.transactions.length,
      successfulX402Payments: successfulTxs.length,
      failedPayments: failedTxs.length,
      rejectedPayments: rejectedTxs.length,
      allTimeTestnetVolumeUSDC: allTimeVolume,
      last30DaysTestnetVolumeUSDC: last30DaysVolume,
      usdcContractAddress: PAYPILOT_CONFIG.contracts.usdcBaseSepolia,
      networkCaip2: PAYPILOT_CONFIG.chain.caip2,
      chainId: PAYPILOT_CONFIG.chain.chainId,
      recipientConfigured: PAYPILOT_CONFIG.recipient.isConfigured,
      paymentRecipientAddress: PAYPILOT_CONFIG.recipient.displayAddress,
      lastUpdated: store.lastUpdated,
    };
  }

  public async resetStoreForTesting(): Promise<void> {
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    if (isTest) {
      this.writeStore(defaultStore);
    }
  }
}

export const dataStore: IPayPilotStorage = new LocalStorageAdapter();
