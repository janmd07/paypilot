'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Sliders, AlertTriangle } from 'lucide-react';
import { SpendingPolicy } from '@/types';

interface SpendingLimitsCardProps {
  policy: SpendingPolicy;
  onUpdatePolicy: (updated: Partial<SpendingPolicy>) => void;
}

export const SpendingLimitsCard: React.FC<SpendingLimitsCardProps> = ({
  policy,
  onUpdatePolicy,
}) => {
  const [maxPerTx, setMaxPerTx] = useState(policy.maxPerTransactionUSDC);
  const [dailyLimit, setDailyLimit] = useState(policy.dailyLimitUSDC);

  const percentSpent = Math.min(
    100,
    Math.round((policy.spentTodayUSDC / (policy.dailyLimitUSDC || 1)) * 100)
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePolicy({
      maxPerTransactionUSDC: Number(maxPerTx),
      dailyLimitUSDC: Number(dailyLimit),
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Autonomous Spending Guard</h2>
            <p className="text-xs text-slate-400">Strict execution constraints for AI agent payments</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUpdatePolicy({ isPaused: !policy.isPaused })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            policy.isPaused
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{policy.isPaused ? 'Agent Paused' : 'Agent Active'}</span>
        </button>
      </div>

      {/* Daily Progress Gauge */}
      <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-slate-400">Daily USDC Spent</span>
          <span className="font-semibold text-white">
            ${policy.spentTodayUSDC.toFixed(2)} / ${policy.dailyLimitUSDC.toFixed(2)} USDC
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              percentSpent >= 90
                ? 'bg-rose-500'
                : percentSpent >= 75
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
            }`}
            style={{ width: `${percentSpent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
          <span>Resets daily at 00:00 UTC</span>
          <span>{percentSpent}% Used</span>
        </div>
      </div>

      {/* Spending Form Controls */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Max Per-Tx Limit (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                value={maxPerTx}
                onChange={(e) => setMaxPerTx(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-medium text-slate-500">
                USDC
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Daily Total Limit (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="200"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-medium text-slate-500">
                USDC
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Payments auto-rejected if limits are exceeded</span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Apply Limits</span>
          </button>
        </div>
      </form>
    </div>
  );
};
