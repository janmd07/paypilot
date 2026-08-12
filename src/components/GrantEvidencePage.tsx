'use client';

import React from 'react';
import { Award, ExternalLink, Zap, FileText, AlertTriangle } from 'lucide-react';
import { GrantEvidenceMetrics, PaymentTransaction } from '@/types';
import { PAYPILOT_CONFIG } from '@/lib/config';

interface GrantEvidencePageProps {
  metrics: GrantEvidenceMetrics;
  transactions: PaymentTransaction[];
}

export const GrantEvidencePage: React.FC<GrantEvidencePageProps> = ({ metrics, transactions }) => {
  const verifiedTransactions = transactions.filter((t) => t.status === 'SUCCESS');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Grant Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 border border-indigo-900/40 p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Base Builder Grant Application Evidence</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              PayPilot Grant Evidence & Audit Dashboard
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Verifiable product metrics, Base Sepolia contract addresses, testnet volume counters, and x402 payment settlement facts generated exclusively from real application usage.
            </p>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shrink-0">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Primary Track</span>
            <span className="text-sm font-bold text-cyan-400">Agents / Agentic Commerce</span>
          </div>
        </div>
      </div>

      {/* Recipient Configuration Warning Banner if unconfigured */}
      {!metrics.recipientConfigured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Deployment Note:</strong> Payment recipient address is currently <code className="bg-amber-950 px-1.5 py-0.5 rounded font-mono text-amber-200">Not configured</code>. Set <code className="bg-amber-950 px-1.5 py-0.5 rounded font-mono text-amber-200">PAYPILOT_PAYMENT_RECIPIENT</code> in environment variables for production settlements.
            </span>
          </div>
        </div>
      )}

      {/* Grant Application Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <span className="block text-xs font-medium text-slate-400 mb-1">All-Time Users Onboarded</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.allTimeUsersOnboarded > 0 ? metrics.allTimeUsersOnboarded : '0'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">Verified</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Source: Unique connected wallet addresses</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <span className="block text-xs font-medium text-slate-400 mb-1">DAU / WAU</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.dau} / {metrics.wau}
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10">Real-time</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Source: Active 24h / 7d user activity sessions</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <span className="block text-xs font-medium text-slate-400 mb-1">All-Time Testnet Volume</span>
          <div className="flex items-baseline justify-between">
            {metrics.allTimeTestnetVolumeUSDC > 0 ? (
              <span className="text-2xl font-black text-emerald-400">${metrics.allTimeTestnetVolumeUSDC.toFixed(2)} USDC</span>
            ) : (
              <span className="text-sm font-semibold text-slate-500">No verified activity yet.</span>
            )}
            <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10">Base Sepolia</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Source: Verified settlement records ({metrics.networkCaip2})</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <span className="block text-xs font-medium text-slate-400 mb-1">x402 Payment Success Rate</span>
          <div className="flex items-baseline justify-between">
            {metrics.totalTaskCount > 0 ? (
              <span className="text-2xl font-black text-cyan-400">
                {Math.round((metrics.successfulX402Payments / metrics.totalTaskCount) * 100)}%
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-500">No activity yet</span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">{metrics.successfulX402Payments} / {metrics.totalTaskCount} paid</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Source: Verified Policy Engine & x402 logs</p>
        </div>

      </div>

      {/* Grant Form Question & Evidence Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
          <FileText className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-base font-bold text-white">Base Builder Grant Field Attestation Matrix</h2>
            <p className="text-xs text-slate-400">Direct mappings between Grant Application fields and verifiable product facts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-indigo-400 block">1. Project Name & Description</span>
            <p className="text-white font-medium">PayPilot — Autonomous USDC Payment Agent for Base</p>
            <p className="text-slate-400 text-[11px]">&quot;PayPilot allows AI agents to pay for digital services using USDC on Base within strict user spending limits.&quot;</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-indigo-400 block">2. Primary Track & Protocol Standard</span>
            <p className="text-white font-medium">Agents / Agentic Commerce</p>
            <p className="text-slate-400 text-[11px]">Official HTTP 402 / x402 payment protocol specification on Base Sepolia (<code className="text-cyan-400">{metrics.networkCaip2}</code>).</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-indigo-400 block">3. Contract & Token Architecture</span>
            <p className="text-white font-medium">Base Sepolia USDC: <code className="text-cyan-400 text-[11px]">{metrics.usdcContractAddress || PAYPILOT_CONFIG.contracts.usdcBaseSepolia}</code></p>
            <p className="text-slate-400 text-[11px]">Recipient Address: <code className="text-amber-300 font-mono text-[11px]">{metrics.paymentRecipientAddress}</code></p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-indigo-400 block">4. Monetization Model</span>
            <p className="text-white font-medium">Transparent Micro-Fee / Service Gateway</p>
            <p className="text-slate-400 text-[11px]">Future model: Transparent gateway fee per successful x402 payment. Current testnet volume is labeled explicitly as testnet activity.</p>
          </div>

        </div>
      </div>

      {/* Verified On-Chain Transactions */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Verifiable Base Sepolia Payment Receipts</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">{verifiedTransactions.length} On-chain Verified</span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {verifiedTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-sans">
              <p className="font-medium text-slate-400">No verified activity yet.</p>
              <p className="text-xs text-slate-600 mt-1">Run an agent task to generate verifiable testnet payment receipts.</p>
            </div>
          ) : (
            verifiedTransactions.map((tx) => (
              <div key={tx.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-bold text-white">{tx.serviceName}</span>
                    <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 font-sans">Verified ${tx.amountUSDC.toFixed(2)} USDC</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">{tx.endpoint} • {tx.timestamp}</span>
                </div>

                <a
                  href={`${PAYPILOT_CONFIG.chain.blockExplorer}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-semibold shrink-0"
                >
                  <span>Explorer Link ({tx.txHash.slice(0, 8)}...)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
