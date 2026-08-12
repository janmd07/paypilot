'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SpendingLimitsCard } from '@/components/SpendingLimitsCard';
import { PaidServiceCard } from '@/components/PaidServiceCard';
import { AgentTerminal } from '@/components/AgentTerminal';
import { PaymentHistoryTable } from '@/components/PaymentHistoryTable';
import { GrantEvidencePage } from '@/components/GrantEvidencePage';
import { SpendingPolicy, AgentExecutionLog, PaymentTransaction, X402PaymentTerms, GrantEvidenceMetrics } from '@/types';
import { globalPolicyEngine } from '@/lib/policy';
import { PAYPILOT_CONFIG } from '@/lib/config';
import { requestWalletConnection, getUSDCBalance } from '@/lib/wallet';
import { Sparkles, Zap, Server } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'grant-evidence'>('dashboard');
  const [policy, setPolicy] = useState<SpendingPolicy>(globalPolicyEngine.getPolicy());
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [metrics, setMetrics] = useState<GrantEvidenceMetrics>({
    allTimeUsersOnboarded: 0,
    dau: 0,
    wau: 0,
    totalTaskCount: 0,
    successfulX402Payments: 0,
    failedPayments: 0,
    rejectedPayments: 0,
    allTimeTestnetVolumeUSDC: 0,
    last30DaysTestnetVolumeUSDC: 0,
    usdcContractAddress: PAYPILOT_CONFIG.contracts.usdcBaseSepolia,
    networkCaip2: PAYPILOT_CONFIG.chain.caip2,
    chainId: PAYPILOT_CONFIG.chain.chainId,
    recipientConfigured: false, // Server/client-neutral default to avoid SSR hydration mismatches
    paymentRecipientAddress: 'Loading...', // Server/client-neutral default to avoid SSR hydration mismatches
    lastUpdated: 'Loading...', // Server/client-neutral default to avoid SSR hydration mismatches
  });

  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  const fetchAnalytics = () => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.metrics) setMetrics(data.metrics);
          if (data.transactions) setTransactions(data.transactions);
        }
      })
      .catch((err) => console.error('Failed to load stored analytics:', err));
  };

  // Load persistent policy and analytics from backend API
  useEffect(() => {
    // Initialize first logs on client side to avoid client/server timestamp hydration mismatch
    setLogs([
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: `PayPilot Agent System initialized. Network: ${PAYPILOT_CONFIG.chain.caip2} (Base Sepolia). Endpoint: GET /api/paid/market-summary ($0.01 USDC)`,
      },
    ]);

    fetch('/api/policy')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.policy) {
          const updated = globalPolicyEngine.updatePolicy(data.policy);
          setPolicy(updated);
        }
      })
      .catch((err) => console.error('Failed to load stored policy:', err));

    fetchAnalytics();
  }, []);

  // Monitor connection, chain change, and accounts change
  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
    if (win && win.on) {
      const handleChainChanged = (hexChainId: string) => {
        setWalletChainId(parseInt(hexChainId, 16));
      };

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          const addr = accounts[0];
          setWalletAddress(addr);
          getUSDCBalance(addr as `0x${string}`).then(setUsdcBalance);
          win.request({ method: 'eth_chainId' }).then((hexId: string) => {
            setWalletChainId(parseInt(hexId, 16));
          });
        } else {
          setWalletAddress(null);
          setUsdcBalance('0.00');
          setWalletChainId(null);
        }
      };

      win.on('chainChanged', handleChainChanged);
      win.on('accountsChanged', handleAccountsChanged);

      // Detect pre-existing connection silently
      win.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            const addr = accounts[0];
            setWalletAddress(addr);
            getUSDCBalance(addr as `0x${string}`).then(setUsdcBalance);
            win.request({ method: 'eth_chainId' }).then((hexId: string) => {
              setWalletChainId(parseInt(hexId, 16));
            });
          }
        })
        .catch((err: any) => console.error('Failed to get accounts on mount:', err));

      return () => {
        if (win.removeListener) {
          win.removeListener('chainChanged', handleChainChanged);
          win.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const conn = await requestWalletConnection();
      if (conn) {
        setWalletAddress(conn.address);
        setWalletChainId(conn.chainId);
        const bal = await getUSDCBalance(conn.address);
        setUsdcBalance(bal);

        // Record user onboarding for analytics
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: conn.address }),
        });

        addLog('info', `Base Wallet connected: ${conn.address.slice(0, 6)}...${conn.address.slice(-4)} (Base Sepolia USDC: $${bal})`);
        fetchAnalytics();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wallet connection failed';
      addLog('error', `Wallet connection error: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUpdatePolicy = async (updated: Partial<SpendingPolicy>) => {
    const newPolicy = globalPolicyEngine.updatePolicy(updated);
    setPolicy(newPolicy);
    addLog('info', `Spending policy updated & saved: Max Per-Payment $${newPolicy.maxPerTransactionUSDC.toFixed(2)}, Daily Cap $${newPolicy.dailyLimitUSDC.toFixed(2)}`);

    try {
      await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to persist policy change:', err);
    }
  };

  const addLog = (
    type: AgentExecutionLog['type'],
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    const newLog: AgentExecutionLog = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      metadata,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const handleExecuteSimulatedTask = async (prompt: string) => {
    setIsExecuting(true);
    addLog('info', `Agent received user task: "${prompt}"`);

    // Step 1: Real GET request to paid x402 demo endpoint returning HTTP 402 + PAYMENT-REQUIRED header
    await new Promise((r) => setTimeout(r, 400));
    try {
      const res = await fetch('/api/paid/market-summary', { method: 'GET' });
      const reqHeader = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');

      if (res.status === 402 && reqHeader) {
        let decodedTerms: X402PaymentTerms | null = null;
        try {
          const jsonStr = atob(reqHeader);
          const parsed = JSON.parse(jsonStr);
          decodedTerms = parsed.x402 || parsed;
        } catch (e) {
          console.error('Failed to decode PAYMENT-REQUIRED header:', e);
        }

        const termsToEvaluate: X402PaymentTerms = decodedTerms || {
          version: PAYPILOT_CONFIG.x402.version,
          scheme: 'exact',
          network: PAYPILOT_CONFIG.chain.caip2,
          chainId: PAYPILOT_CONFIG.chain.chainId,
          asset: PAYPILOT_CONFIG.contracts.usdcBaseSepolia,
          amount: '10000',
          amountUSDC: 0.01,
          payTo: PAYPILOT_CONFIG.recipient.address || 'Not configured',
          resource: '/api/paid/market-summary',
          description: 'BTC & ETH Market Intelligence Summary ($0.01 USDC)',
        };

        addLog(
          'payment_req',
          `HTTP 402 Payment Required received from /api/paid/market-summary ($${termsToEvaluate.amountUSDC.toFixed(2)} USDC requested via ${PAYPILOT_CONFIG.x402.paymentRequiredHeader} header)`
        );

        // Step 2: Policy Evaluation of Server Payment Requirements
        await new Promise((r) => setTimeout(r, 500));
        const decision = globalPolicyEngine.evaluatePayment(termsToEvaluate);

        if (!decision.allowed) {
          addLog('payment_rejected', `Policy Decision: REJECTED — ${decision.reason}`);
          const rejectedTx: PaymentTransaction = {
            id: 'tx-' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            isoTimestamp: new Date().toISOString(),
            userAddress: walletAddress || undefined,
            serviceName: 'PayPilot Market Summary API',
            endpoint: termsToEvaluate.resource,
            amountUSDC: termsToEvaluate.amountUSDC,
            recipientAddress: termsToEvaluate.payTo,
            txHash: '',
            network: PAYPILOT_CONFIG.chain.caip2,
            chainId: PAYPILOT_CONFIG.chain.chainId,
            status: 'REJECTED',
            isTestnet: true,
          };

          setTransactions((prev) => [rejectedTx, ...prev]);
          setIsExecuting(false);
          return;
        }

        addLog('payment_ok', `Policy Decision: APPROVED — ${decision.reason}`);
        addLog(
          'info',
          `Server payment terms validated. Phase 3 service challenge verified cleanly. (Phase 4 will execute autonomous payment signing).`
        );
      } else if (res.status === 500) {
        const errorJson = await res.json();
        addLog('error', `Service Configuration Error: ${errorJson.error || 'Recipient not configured'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      addLog('error', `Task execution error: ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        walletAddress={walletAddress}
        usdcBalance={usdcBalance}
        isConnecting={isConnecting}
        onConnectWallet={handleConnectWallet}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {activeTab === 'grant-evidence' ? (
          <GrantEvidencePage metrics={metrics} transactions={transactions} />
        ) : (
          <>
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/30 p-8 shadow-2xl">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Base Sepolia Protocol ({PAYPILOT_CONFIG.chain.caip2})</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Autonomous AI Payment Agent for Base
                  </h1>
                  <p className="text-sm text-slate-300">
                    PayPilot empowers AI agents to pay for digital services using USDC on Base Sepolia via the official x402 protocol, under strict user-defined spending limits.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Base Network</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 justify-center">
                      <Zap className="w-3.5 h-3.5" /> Sepolia
                    </span>
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Standard</span>
                    <span className="text-sm font-bold text-cyan-400 flex items-center gap-1 justify-center">
                      <Server className="w-3.5 h-3.5" /> x402 V2 Transport
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Spending Limits & Service Card */}
              <div className="lg:col-span-5 space-y-8">
                <SpendingLimitsCard policy={policy} onUpdatePolicy={handleUpdatePolicy} />
                <PaidServiceCard
                  recipientAddress={metrics.paymentRecipientAddress}
                  isRecipientConfigured={metrics.recipientConfigured}
                />
              </div>

              {/* Right Column: Agent Execution Terminal */}
              <div className="lg:col-span-7">
                <AgentTerminal
                  policy={policy}
                  onExecuteSimulatedTask={handleExecuteSimulatedTask}
                  logs={logs}
                  isExecuting={isExecuting}
                  walletAddress={walletAddress}
                  walletChainId={walletChainId}
                />
              </div>

            </div>

            {/* Audit Trail Section */}
            <div>
              <PaymentHistoryTable transactions={transactions} />
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 PayPilot. Built for Base Builder Grant & Sepolia Testnet.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Base Sepolia USDC: 0x036C...CF7e</span>
            <span>Network: {PAYPILOT_CONFIG.chain.caip2}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
