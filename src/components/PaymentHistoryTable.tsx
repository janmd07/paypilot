'use client';

import React from 'react';
import { History, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PaymentTransaction } from '@/types';
import { PAYPILOT_CONFIG } from '@/lib/config';

interface PaymentHistoryTableProps {
  transactions: PaymentTransaction[];
}

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({ transactions }) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Payment Audit Log</h2>
            <p className="text-xs text-slate-400">Autonomous Base Sepolia USDC transfers & policy decisions</p>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">Total Transactions: {transactions.length}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold">
            <tr>
              <th className="py-3.5 px-6">Timestamp</th>
              <th className="py-3.5 px-6">Service API</th>
              <th className="py-3.5 px-6">Amount</th>
              <th className="py-3.5 px-6">Recipient Address</th>
              <th className="py-3.5 px-6">Tx Hash</th>
              <th className="py-3.5 px-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                  <p className="font-semibold text-slate-400">No verified activity yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Submit an agent task to trigger autonomous x402 payment execution.</p>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 text-slate-400">{tx.timestamp}</td>
                  <td className="py-4 px-6 font-sans">
                    <span className="font-semibold text-white">{tx.serviceName}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">{tx.endpoint}</span>
                  </td>
                  <td className="py-4 px-6 font-bold text-white">${tx.amountUSDC.toFixed(2)} USDC</td>
                  <td className="py-4 px-6 text-slate-400">
                    {tx.recipientAddress && tx.recipientAddress.startsWith('0x')
                      ? `${tx.recipientAddress.slice(0, 6)}...${tx.recipientAddress.slice(-4)}`
                      : tx.recipientAddress || 'Not configured'}
                  </td>
                  <td className="py-4 px-6">
                    {tx.txHash && tx.txHash.startsWith('0x') ? (
                      <a
                        href={`${PAYPILOT_CONFIG.chain.blockExplorer}/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                      >
                        <span>{tx.txHash.slice(0, 8)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right font-sans">
                    {tx.status === 'SUCCESS' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    )}
                    {tx.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px]">
                        <XCircle className="w-3 h-3" /> Blocked
                      </span>
                    )}
                    {tx.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold text-[11px]">
                        <Clock className="w-3 h-3 animate-spin" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
