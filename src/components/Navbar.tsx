'use client';

import React from 'react';
import { Cpu, Wallet, Award, LayoutDashboard } from 'lucide-react';
import { PAYPILOT_CONFIG } from '@/lib/config';

interface NavbarProps {
  activeTab: 'dashboard' | 'grant-evidence';
  onTabChange: (tab: 'dashboard' | 'grant-evidence') => void;
  walletAddress: string | null;
  usdcBalance: string;
  isConnecting: boolean;
  onConnectWallet: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  walletAddress,
  usdcBalance,
  isConnecting,
  onConnectWallet,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">PayPilot</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Base Sepolia
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Autonomous USDC Payment Agent</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('grant-evidence')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'grant-evidence'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Grant Evidence</span>
          </button>
        </nav>

        {/* Network & Wallet Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{PAYPILOT_CONFIG.chain.name}</span>
          </div>

          {walletAddress ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Connected</span>
              <span className="text-slate-700 font-normal">|</span>
              <span className="text-slate-300 font-medium">USDC: <span className="font-bold text-white">${usdcBalance}</span></span>
              <span className="text-slate-700 font-normal">|</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Base Wallet'}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
