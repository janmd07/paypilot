/**
 * PayPilot Type Definitions
 * Strictly conforming to official x402 specification standards, Base Sepolia CAIP-2 (eip155:84532), and Base Builder Grant evidence requirements.
 */

export interface SpendingPolicy {
  maxPerTransactionUSDC: number;
  dailyLimitUSDC: number;
  spentTodayUSDC: number;
  allowlistServices: string[];
  requireApprovalAboveUSDC: number;
  isPaused: boolean;
  lastResetTimestamp: string;
}

/**
 * Official x402 Payment Terms (HTTP 402 Body & Header Standards)
 */
export interface X402PaymentTerms {
  version: string;
  scheme: 'exact' | 'up_to';
  network: string; // CAIP-2 identifier e.g. "eip155:84532"
  chainId: number; // 84532 for Base Sepolia
  asset: string; // Base Sepolia Circle USDC contract (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
  amount: string; // Amount in atomic units (6 decimals for USDC e.g. "10000" = 0.01 USDC)
  amountUSDC: number; // Human readable decimal amount
  payTo: string; // Recipient wallet address
  resource: string; // Target endpoint URL
  description: string;
}

export interface PaymentDecision {
  allowed: boolean;
  reason: string;
  terms: X402PaymentTerms;
  policySnapshot: SpendingPolicy;
}

export interface AgentExecutionLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'payment_req' | 'payment_ok' | 'payment_rejected' | 'success' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransaction {
  id: string;
  timestamp: string;
  isoTimestamp: string; // ISO 8601 string for exact date calculations
  userAddress?: string;
  serviceName: string;
  endpoint: string;
  amountUSDC: number;
  recipientAddress: string;
  txHash: string;
  network: string; // CAIP-2 network identifier e.g. "eip155:84532"
  chainId: number;
  status: 'PENDING' | 'SUCCESS' | 'REJECTED' | 'FAILED';
  blockExplorerUrl?: string;
  isTestnet: boolean;
}

/**
 * Grant Evidence Metrics (Strictly non-fabricated, real product counters)
 */
export interface GrantEvidenceMetrics {
  allTimeUsersOnboarded: number;
  dau: number;
  wau: number;
  totalTaskCount: number;
  successfulX402Payments: number;
  failedPayments: number;
  rejectedPayments: number;
  allTimeTestnetVolumeUSDC: number;
  last30DaysTestnetVolumeUSDC: number;
  usdcContractAddress: string;
  networkCaip2: string;
  chainId: number;
  recipientConfigured: boolean;
  paymentRecipientAddress: string;
  lastUpdated: string;
}

/**
 * Abstraction Interface for Persistent Storage
 */
export interface IPayPilotStorage {
  getPolicy(): Promise<SpendingPolicy>;
  savePolicy(policy: Partial<SpendingPolicy>): Promise<SpendingPolicy>;
  getTransactions(): Promise<PaymentTransaction[]>;
  addTransaction(tx: PaymentTransaction): Promise<PaymentTransaction[]>;
  recordUserOnboarding(walletAddress: string): Promise<number>;
  getGrantMetrics(): Promise<GrantEvidenceMetrics>;
  resetStoreForTesting?(): Promise<void>;
}
