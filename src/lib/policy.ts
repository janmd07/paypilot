import { SpendingPolicy, X402PaymentTerms, PaymentDecision } from '@/types';
import { PAYPILOT_CONFIG } from './config';

let agentAddress: string | null = null;
function getAgentAddress(): string | null {
  if (agentAddress) return agentAddress;
  if (typeof window === 'undefined') {
    try {
      const rawPrivateKey = process.env.AGENT_PRIVATE_KEY || '';
      const formattedPrivateKey = (
        rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`
      ) as `0x${string}`;

      if (
        formattedPrivateKey &&
        formattedPrivateKey.length === 66 &&
        /^0x[0-9a-fA-F]{64}$/.test(formattedPrivateKey) &&
        !formattedPrivateKey.includes('0000000000000000000000000000000000000000000000000000000000000000')
      ) {
        const { privateKeyToAccount } = require('viem/accounts');
        const account = privateKeyToAccount(formattedPrivateKey);
        agentAddress = account.address;
        return agentAddress;
      }
    } catch (err) {
      console.error('Failed to derive agent address for policy engine:', err);
    }
  }
  return null;
}


/**
 * Spending Policy Engine
 * Evaluates whether incoming official x402 V2 payment requirements meet user spending limits
 * and PayPilot's security parameters BEFORE any payment signature or broadcast occurs.
 */
export class PolicyEngine {
  private policy: SpendingPolicy;

  constructor(initialPolicy?: Partial<SpendingPolicy>) {
    // CRITICAL SECURITY WARNING:
    // The current in-memory policy spending counter (`this.policy.spentTodayUSDC`) is safe ONLY 
    // for local single-instance testnet demonstrations. It is NOT safe for multi-instance, 
    // containerized, or serverless production environments (like Vercel functions), as concurrent 
    // requests can cause race conditions or bypasses due to unshared execution memory.
    // Redesigns using a central distributed store (e.g. Redis) are required for production.
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.warn(
        'WARNING: PolicyEngine is using local in-memory state in production. This is safe only for single-instance demo environments.'
      );
    }
    this.policy = {
      ...PAYPILOT_CONFIG.defaultPolicy,
      ...initialPolicy,
    };
    this.checkDailyReset();
  }

  private checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.policy.lastResetTimestamp !== today) {
      this.policy.spentTodayUSDC = 0;
      this.policy.lastResetTimestamp = today;
    }
  }

  public getPolicy(): SpendingPolicy {
    this.checkDailyReset();
    return { ...this.policy };
  }

  public updatePolicy(newPolicy: Partial<SpendingPolicy>): SpendingPolicy {
    this.checkDailyReset();
    this.policy = {
      ...this.policy,
      ...newPolicy,
    };
    return this.getPolicy();
  }

  public evaluatePayment(terms: X402PaymentTerms): PaymentDecision {
    this.checkDailyReset();

    // Rule 1: Check if autonomous agent is paused by user
    if (this.policy.isPaused) {
      return {
        allowed: false,
        reason: 'Autonomous payments are currently PAUSED by the user.',
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    // Rule 2: Validate CAIP-2 Network Identifier (eip155:84532) & ChainId (84532)
    if (
      terms.network !== PAYPILOT_CONFIG.chain.caip2 &&
      terms.chainId !== PAYPILOT_CONFIG.chain.chainId
    ) {
      return {
        allowed: false,
        reason: `Invalid network identifier (${terms.network} / chainId ${terms.chainId}). Expected Base Sepolia (${PAYPILOT_CONFIG.chain.caip2}).`,
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    // Rule 3: Validate USDC Token Asset Address (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
    if (
      terms.asset &&
      terms.asset.toLowerCase() !== PAYPILOT_CONFIG.contracts.usdcBaseSepolia.toLowerCase()
    ) {
      return {
        allowed: false,
        reason: `Invalid token asset address (${terms.asset}). Expected Base Sepolia USDC (${PAYPILOT_CONFIG.contracts.usdcBaseSepolia}).`,
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    // Rule 4: Validate Recipient Wallet Configuration
    if (!terms.payTo || terms.payTo === 'Not configured' || !terms.payTo.startsWith('0x')) {
      return {
        allowed: false,
        reason: 'Payment recipient address is unconfigured or invalid.',
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    // Rule 4b: Prevent self-transfer (cannot pay to own agent wallet address)
    const derivedAgentAddress = getAgentAddress();
    if (
      derivedAgentAddress &&
      terms.payTo &&
      terms.payTo.toLowerCase() === derivedAgentAddress.toLowerCase()
    ) {
      return {
        allowed: false,
        reason: `Self-transfer safety violation: Recipient address (${terms.payTo}) matches the Agent's own wallet address. Paid services must settle to a separate recipient wallet.`,
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    // Rule 5: Validate Maximum Per-Transaction Limit
    if (terms.amountUSDC > this.policy.maxPerTransactionUSDC) {
      return {
        allowed: false,
        reason: `Payment amount ($${terms.amountUSDC.toFixed(2)} USDC) exceeds max per-payment cap ($${this.policy.maxPerTransactionUSDC.toFixed(2)} USDC).`,
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    // Rule 6: Validate Daily Spending Budget Cap
    const projectedDailyTotal = this.policy.spentTodayUSDC + terms.amountUSDC;
    if (projectedDailyTotal > this.policy.dailyLimitUSDC) {
      return {
        allowed: false,
        reason: `Payment amount ($${terms.amountUSDC.toFixed(2)} USDC) exceeds remaining daily budget cap ($${(this.policy.dailyLimitUSDC - this.policy.spentTodayUSDC).toFixed(2)} USDC left today).`,
        terms,
        policySnapshot: this.getPolicy(),
      };
    }

    return {
      allowed: true,
      reason: `Approved within spending policy limits on Base Sepolia (${PAYPILOT_CONFIG.chain.caip2}).`,
      terms,
      policySnapshot: this.getPolicy(),
    };
  }

  public recordPayment(amountUSDC: number): void {
    this.checkDailyReset();
    this.policy.spentTodayUSDC += amountUSDC;
  }
}

export const globalPolicyEngine = new PolicyEngine();
