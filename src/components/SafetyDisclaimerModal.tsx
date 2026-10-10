/**
 * @file SafetyDisclaimerModal.tsx
 * =============================================================================
 * REGULATORY SAFETY, COMPLIANCE & NON-CUSTODIAL BOUNDARY MODAL
 * =============================================================================
 * This modal explains the strict regulatory guardrails of Language Bridge.
 *
 * Core Principles:
 * 1. Educational Interface Guidance Only: The application is designed solely to
 *    demystify complex English user interfaces and translate technical terminology.
 * 2. Not Financial Advice: It does not recommend purchasing, selling, or holding
 *    any cryptocurrency or asset.
 * 3. Non-Custodial & No Direct Action: The agent has zero wallet keys, cannot sign
 *    transactions, and never presses confirmation buttons on behalf of the user.
 * 4. Human-in-the-Loop: Verbal confirmation is required at every sensitive juncture.
 * =============================================================================
 */

import React from "react";
import { ShieldCheck, AlertTriangle, X, Check, Lock, UserCheck } from "lucide-react";
import { APP_CONFIG } from "../config/appConfig";
import { logFunctionCall } from "../utils/logger";

interface SafetyDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SafetyDisclaimerModal component rendering formal safety architecture details.
 *
 * @param props - SafetyDisclaimerModalProps
 * @returns React.JSX.Element | null
 */
export function SafetyDisclaimerModal({
  isOpen,
  onClose,
}: SafetyDisclaimerModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  logFunctionCall("SAFETY_DISCLAIMER_MODAL", "render", { isOpen });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={() => {
            logFunctionCall("SAFETY_DISCLAIMER_MODAL", "close", {});
            onClose();
          }}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">
              Trust & Safety Boundaries
            </h3>
            <p className="text-xs text-slate-400">
              Language Bridge Architectural Guardrails
            </p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100 block">
                1. Non-Custodial Architecture
              </span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                The agent never requests, stores, or manages private keys, wallet seed
                phrases, or account passwords. It operates strictly outside user credentials.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100 block">
                2. No Autonomous Execution
              </span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                The agent cannot place trades or press submission buttons. You retain
                100% control over every click and confirmation.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100 block">
                3. Educational Interface Literacy Only
              </span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                This service translates English UX terminology and surfaces fee
                structures. It does not constitute financial, investment, legal, or tax
                advice.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
