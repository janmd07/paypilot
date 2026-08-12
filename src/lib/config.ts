import { baseSepolia } from 'viem/chains';

const configuredRecipient =
  process.env.PAYPILOT_PAYMENT_RECIPIENT ||
  process.env.NEXT_PUBLIC_PAYPILOT_RECIPIENT ||
  '';

export const PAYPILOT_CONFIG = {
  appName: 'PayPilot',
  appDescription: 'Autonomous USDC Micropayment Agent for Base',
  chain: {
    name: 'Base Sepolia Testnet',
    caip2: `eip155:${baseSepolia.id}`, // eip155:84532
    chainId: baseSepolia.id, // 84532
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
  contracts: {
    usdcBaseSepolia: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
  },
  recipient: {
    address: configuredRecipient,
    isConfigured: Boolean(configuredRecipient && configuredRecipient.startsWith('0x')),
    displayAddress: configuredRecipient && configuredRecipient.startsWith('0x') ? configuredRecipient : 'Not configured',
  },
  x402: {
    version: '2.0',
    paymentRequiredHeader: 'PAYMENT-REQUIRED', // Server -> Client: Base64 PaymentRequired payload
    paymentSignatureHeader: 'PAYMENT-SIGNATURE', // Client -> Server: Base64 PaymentPayload signature
    paymentResponseHeader: 'PAYMENT-RESPONSE', // Server -> Client: Base64 SettlementResponse proof
  },
  defaultPolicy: {
    maxPerTransactionUSDC: 1.0,
    dailyLimitUSDC: 5.0,
    spentTodayUSDC: 0.0,
    allowlistServices: ['*'],
    requireApprovalAboveUSDC: 2.0,
    isPaused: false,
    lastResetTimestamp: new Date().toISOString().split('T')[0],
  },
  agent: {
    model: 'gpt-4o-mini',
  },
};
