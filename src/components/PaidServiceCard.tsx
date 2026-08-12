'use client';

import React, { useState } from 'react';
import { Server, AlertTriangle, Code2, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { PAYPILOT_CONFIG } from '@/lib/config';

interface PaidServiceCardProps {
  recipientAddress: string;
  isRecipientConfigured: boolean;
}

export const PaidServiceCard: React.FC<PaidServiceCardProps> = ({
  recipientAddress,
  isRecipientConfigured,
}) => {
  const [testResult, setTestResult] = useState<{
    status: number;
    paymentRequiredHeader?: string;
    decodedRequirements?: Record<string, any>;
    error?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isRawPayloadExpanded, setIsRawPayloadExpanded] = useState(false);

  const handleTest402Challenge = async () => {
    setIsTesting(true);
    setIsDetailsExpanded(false);
    setIsRawPayloadExpanded(false);
    try {
      const res = await fetch('/api/paid/market-summary', { method: 'GET' });
      const reqHeader = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');

      let decoded: Record<string, any> | undefined = undefined;
      if (reqHeader) {
        try {
          const jsonStr = atob(reqHeader);
          decoded = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to decode Base64 PAYMENT-REQUIRED header:', e);
        }
      }

      setTestResult({
        status: res.status,
        paymentRequiredHeader: reqHeader || undefined,
        decodedRequirements: decoded,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      setTestResult({ status: 500, error: msg });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">x402 V2 Paid API Endpoint</h2>
            <p className="text-xs text-slate-400">Real x402 protected resource requiring testnet USDC</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          x402 V2 Protocol
        </span>
      </div>

      {/* Recipient Config Alert */}
      {!isRecipientConfigured && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Payment recipient is <code className="font-mono text-white bg-amber-950 px-1 py-0.5 rounded">Not configured</code>. Set <code className="font-mono text-white bg-amber-950 px-1 py-0.5 rounded">PAYPILOT_PAYMENT_RECIPIENT</code> in environment variables.
          </span>
        </div>
      )}

      {/* Service Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-500 font-medium">Endpoint URL</span>
          <code className="block font-mono text-cyan-400 font-semibold truncate">GET /api/paid/market-summary</code>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-500 font-medium">Price & Asset</span>
          <span className="block text-white font-bold">$0.01 USDC (10,000 atomic units)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-500 font-medium">Network Identifier</span>
          <span className="block text-emerald-400 font-mono font-semibold">{PAYPILOT_CONFIG.chain.caip2} (Base Sepolia)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-500 font-medium">Payment Recipient</span>
          <span className="block text-slate-300 font-mono truncate">{recipientAddress}</span>
        </div>
      </div>

      {/* Interactive 402 Challenge Tester */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Test HTTP 402 Challenge & PAYMENT-REQUIRED header payload</span>
        </div>

        <button
          type="button"
          onClick={handleTest402Challenge}
          disabled={isTesting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isTesting ? 'Testing...' : 'Test x402 Payment Challenge'}</span>
        </button>
      </div>

      {/* Test Result Display */}
      {testResult && (
        <div className="space-y-3">
          
          {/* HTTP Status Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex items-center justify-between">
            <span className="text-slate-400">HTTP Status:</span>
            <span className={`font-bold ${testResult.status === 402 ? 'text-amber-400' : 'text-rose-400'}`}>
              HTTP {testResult.status} {testResult.status === 402 ? 'Payment Required' : ''}
            </span>
          </div>

          {/* Collapsible Details */}
          {testResult.decodedRequirements && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/80 hover:bg-slate-900/50 text-xs font-semibold text-white transition-colors"
              >
                <span>Payment Requirement Details</span>
                {isDetailsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isDetailsExpanded && (
                <div className="p-4 space-y-4 border-t border-slate-800/80 bg-slate-950/20">
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-mono">
                    <span className="text-slate-500 font-medium">Protocol:</span>
                    <span className="text-white">x402 V2</span>

                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className="text-amber-400 font-bold">HTTP 402 Payment Required</span>

                    <span className="text-slate-500 font-medium">Scheme:</span>
                    <span className="text-white">
                      {String((testResult.decodedRequirements.x402?.scheme || testResult.decodedRequirements.scheme) || 'exact')}
                    </span>

                    <span className="text-slate-500 font-medium">Network:</span>
                    <span className="text-white truncate">
                      Base Sepolia / {String((testResult.decodedRequirements.x402?.network || testResult.decodedRequirements.network) || 'eip155:84532')}
                    </span>

                    <span className="text-slate-500 font-medium">Asset:</span>
                    <span className="text-white">USDC</span>

                    <span className="text-slate-500 font-medium">Amount:</span>
                    <span className="text-white font-semibold">
                      ${((testResult.decodedRequirements.x402?.amountUSDC || testResult.decodedRequirements.amountUSDC) || 0.01).toFixed(2)} USDC
                    </span>

                    <span className="text-slate-500 font-medium">Recipient:</span>
                    <span className="text-slate-300 truncate" title={String((testResult.decodedRequirements.x402?.payTo || testResult.decodedRequirements.payTo) || recipientAddress)}>
                      {String((testResult.decodedRequirements.x402?.payTo || testResult.decodedRequirements.payTo) || recipientAddress)}
                    </span>

                    <span className="text-slate-500 font-medium">Resource:</span>
                    <span className="text-cyan-400 font-semibold truncate">
                      {String((testResult.decodedRequirements.x402?.resource || testResult.decodedRequirements.resource) || '/api/paid/market-summary')}
                    </span>
                  </div>

                  {/* Inner Collapsible Raw Payload */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsRawPayloadExpanded(!isRawPayloadExpanded)}
                      className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-900/50 hover:bg-slate-900 text-[10px] font-semibold text-slate-300 transition-colors"
                    >
                      <span>View Raw Protocol Payload</span>
                      {isRawPayloadExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {isRawPayloadExpanded && (
                      <div className="p-3.5 space-y-3.5 border-t border-slate-800 font-mono text-[10px] bg-slate-950">
                        {testResult.paymentRequiredHeader && (
                          <div className="space-y-1">
                            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Raw PAYMENT-REQUIRED Header (Base64)</span>
                            <p className="text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800/80 break-all max-h-24 overflow-y-auto">
                              {testResult.paymentRequiredHeader}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Decoded Payment Requirements (x402 V2)</span>
                          <pre className="text-cyan-300 bg-slate-900 p-2.5 rounded border border-slate-800/80 overflow-x-auto">
                            {JSON.stringify(testResult.decodedRequirements, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
