'use client';

import React, { useState } from 'react';
import { Terminal, Play, Loader2, Sparkles, CheckCircle2, XCircle, ShieldAlert, Cpu } from 'lucide-react';
import { SpendingPolicy, AgentExecutionLog } from '@/types';
import { ExecutionTraceStep, PaymentAuditRecord } from '@/lib/x402-client';

interface AgentTerminalProps {
  policy: SpendingPolicy;
  onExecuteSimulatedTask?: (prompt: string) => void;
  logs: AgentExecutionLog[];
  isExecuting: boolean;
  walletAddress: string | null;
  walletChainId: number | null;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({
  policy,
  walletAddress,
  walletChainId,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [agentTrace, setAgentTrace] = useState<ExecutionTraceStep[]>([]);
  const [paymentAudit, setPaymentAudit] = useState<PaymentAuditRecord | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const sampleTasks = [
    'Get the latest BTC and ETH market summary',
    'Analyze Base Sepolia network gas and market status',
    'Fetch market summary and check if BTC is above...',
  ];

  const handleRunAgent = async (promptToRun?: string) => {
    if (!walletAddress || walletChainId !== 84532) {
      setAgentError('Wallet connection required on Base Sepolia.');
      return;
    }

    const task = promptToRun || customPrompt;
    if (!task || task.trim() === '') return;

    setIsRunningAgent(true);
    setAgentTrace([]);
    setPaymentAudit(null);
    setAiSummary(null);
    setAgentError(null);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, userWalletAddress: walletAddress }),
      });

      const data = await res.json();

      if (data.executionTrace) setAgentTrace(data.executionTrace);
      if (data.paymentAudit) setPaymentAudit(data.paymentAudit);

      if (data.success && data.aiResponse) {
        setAiSummary(data.aiResponse);
      } else {
        setAgentError(data.error || 'Agent execution encountered an error.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Agent invocation failed';
      setAgentError(msg);
    } finally {
      setIsRunningAgent(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-6">
      
      {/* Terminal Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Autonomous AI Agent Execution</h2>
            <p className="text-xs text-slate-400">OpenAI agent with x402 payment capability</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!walletAddress ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
              <XCircle className="w-3 h-3 text-slate-400" /> Disconnected
            </span>
          ) : walletChainId !== 84532 ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-400" /> Wrong Network
            </span>
          ) : policy.isPaused ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-400" /> Agent Paused
            </span>
          ) : isRunningAgent ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Session
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Ready
            </span>
          )}
        </div>
      </div>

      {/* Task Input Section */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          AI Agent Task Prompt
        </label>
        
        <div className="relative">
          <textarea
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Type a task requiring paid digital APIs..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-sans resize-none"
          />
        </div>

        {/* Quick Sample Prompts */}
        <div className="flex flex-wrap gap-2">
          {sampleTasks.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCustomPrompt(t);
              }}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50 transition-all cursor-pointer truncate max-w-xs"
            >
              &quot;{t.slice(0, 45)}...&quot;
            </button>
          ))}
        </div>

        {/* Warning messages */}
        {!walletAddress ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Connect Base Sepolia Wallet to continue.</span>
          </div>
        ) : walletChainId !== 84532 ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>Connected to wrong network. Please switch to Base Sepolia.</span>
          </div>
        ) : null}

        {/* Run Agent Button */}
        <button
          type="button"
          onClick={() => handleRunAgent()}
          disabled={!walletAddress || walletChainId !== 84532 || isRunningAgent || policy.isPaused}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunningAgent ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing AI Agent & x402 Client Flow...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Autonomous Agent Task</span>
            </>
          )}
        </button>
      </div>

      {/* Execution Trace Stepper */}
      {agentTrace.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-400" /> Real Execution Trace
            </span>

            {paymentAudit && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  paymentAudit.status === 'SETTLED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : paymentAudit.status === 'POLICY_REJECTED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                Status: {paymentAudit.status}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {agentTrace.map((step) => (
              <div
                key={step.stepNumber}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-start gap-2.5"
              >
                <div className="mt-0.5">
                  {step.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : step.status === 'REJECTED' ? (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  ) : step.status === 'FAILED' ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-200">
                      [{step.stepNumber}] {step.title}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">{step.timestamp}</span>
                  </div>
                  {step.details && <p className="text-slate-400 text-[11px] leading-relaxed">{step.details}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Final Response Box */}
      {aiSummary && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>AI Agent Response Synthesis</span>
          </div>
          <div className="text-slate-200 whitespace-pre-wrap font-sans leading-relaxed text-xs">
            {aiSummary}
          </div>
        </div>
      )}

      {/* Agent Execution Error */}
      {agentError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 space-y-1">
          <span className="font-bold block">Agent Execution Stopped</span>
          <p>{agentError}</p>
        </div>
      )}

    </div>
  );
};
