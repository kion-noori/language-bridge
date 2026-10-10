/**
 * @file TrustLoopIndicator.tsx
 * =============================================================================
 * 4-STAGE TRUST LOOP VISUAL PIPELINE
 * =============================================================================
 * This component visualizes the mandatory Trust Loop protocol that governs all
 * agentic behaviors in Language Bridge:
 *
 * Stage 1: Screen Parsing (Visual element identification & plain native explanation)
 * Stage 2: Risk & Fee Disclosure (Surfacing network fees, Coinbase cut, price volatility)
 * Stage 3: Explicit Verbal Confirmation (Human-in-the-loop permission gate)
 * Stage 4: Safe Next Step Guidance (Non-custodial step-by-step instruction)
 *
 * Use Cases:
 * 1. Proves to hackathon judges and end users that the agent never acts autonomously.
 * 2. Visualizes live state transitions as the user converses with the Live API.
 * 3. Highlights active risk warning tags when Coinbase fees or network costs are detected.
 * =============================================================================
 */

import React from "react";
import { Eye, AlertTriangle, CheckCircle2, ArrowRightCircle, Shield } from "lucide-react";
import { APP_CONFIG } from "../config/appConfig";
import { TrustLoopStageId, ScreenAnalysisResult } from "../types/guide";
import { logFunctionCall } from "../utils/logger";

interface TrustLoopIndicatorProps {
  currentStage: TrustLoopStageId;
  analysis?: ScreenAnalysisResult | null;
  onConfirmStep?: () => void;
}

/**
 * TrustLoopIndicator component rendering interactive 4-stage safety cards.
 *
 * @param props - TrustLoopIndicatorProps
 * @returns React.JSX.Element
 */
export function TrustLoopIndicator({
  currentStage,
  analysis,
  onConfirmStep,
}: TrustLoopIndicatorProps): React.JSX.Element {
  logFunctionCall("TRUST_LOOP_INDICATOR", "render", { currentStage });

  const stages = [
    {
      id: "screen_parsing",
      num: "1",
      name: "Screen Parsing",
      short: "Explain Screen",
      icon: Eye,
      detail: "Identifies visible Bitcoin rates, payment method, and amount fields in native language.",
    },
    {
      id: "risk_disclosure",
      num: "2",
      name: "Risk & Fee Disclosure",
      short: "Surface Risks & Fees",
      icon: AlertTriangle,
      detail: "Discloses Coinbase fees, network costs, spread, and irreversible purchase warnings.",
    },
    {
      id: "verbal_confirmation",
      num: "3",
      name: "Explicit Verbal Confirmation",
      short: "Ask Verbal Consent",
      icon: CheckCircle2,
      detail: "Mandatory human permission check. The agent asks: 'Do you want me to guide you now?'",
    },
    {
      id: "guided_next_step",
      num: "4",
      name: "Safe Next Step",
      short: "Guide User Hand",
      icon: ArrowRightCircle,
      detail: "Provides precise instruction on which button to click. Never clicks autonomously.",
    },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              The 4-Stage Trust Loop Protocol
              <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Non-Custodial Guarantee
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              The agent never auto-executes actions. Every critical transition requires verbal permission.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Steps visual flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stages.map((stage) => {
          const isActive = currentStage === stage.id;
          const isPassed =
            stages.findIndex((s) => s.id === currentStage) >
            stages.findIndex((s) => s.id === stage.id);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`relative p-3.5 rounded-xl border transition-all ${
                isActive
                  ? "bg-slate-950 border-cyan-500 shadow-md ring-1 ring-cyan-500/50"
                  : isPassed
                  ? "bg-slate-950/50 border-emerald-500/40 opacity-90"
                  : "bg-slate-950/30 border-slate-800/60 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                    isActive
                      ? "bg-cyan-500 text-slate-950"
                      : isPassed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {stage.num}
                </span>

                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? "text-cyan-400 animate-pulse"
                      : isPassed
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }`}
                />
              </div>

              <h4
                className={`text-xs font-semibold ${
                  isActive ? "text-cyan-300" : isPassed ? "text-emerald-300" : "text-slate-300"
                }`}
              >
                {stage.short}
              </h4>

              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {stage.detail}
              </p>

              {isActive && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Active Step
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Stage Insights & Risk Breakdown (if analysis exists) */}
      {analysis && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Detected fees & charges */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <h5 className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
              <span>Disclosed Fees & Spread</span>
              <span className="text-[10px] text-emerald-400 font-normal">
                {analysis.fees?.length || 0} items identified
              </span>
            </h5>
            <div className="space-y-1.5">
              {analysis.fees && analysis.fees.length > 0 ? (
                analysis.fees.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900 border border-slate-800/60"
                  >
                    <span className="text-slate-300">{f.name}:</span>
                    <span className="font-semibold text-amber-300">{f.amount}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  Standard exchange fees & network miner fees transparently monitored.
                </p>
              )}
            </div>
          </div>

          {/* Plain language verbal confirmation question */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30">
            <h5 className="text-xs font-semibold text-cyan-300 flex items-center justify-between mb-2">
              <span>Verbal Confirmation Prompt</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                Awaiting Human Voice
              </span>
            </h5>
            <p className="text-xs text-slate-200 italic mb-2">
              "{analysis.confirmationPrompt || 'Say "Yes" or "بله" to guide the next safe step.'}"
            </p>
            {onConfirmStep && (
              <button
                onClick={onConfirmStep}
                className="w-full text-center py-1.5 px-3 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
              >
                Simulate Verbal Confirmation ("Yes / بله")
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
