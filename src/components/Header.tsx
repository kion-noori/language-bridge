/**
 * @file Header.tsx
 * =============================================================================
 * APPLICATION HEADER & HACKATHON STATUS BAR
 * =============================================================================
 * This component provides the top navigation bar, branding, and real-time
 * session status indicators for Language Bridge.
 *
 * Use Cases:
 * 1. Displays product title and hackathon provenance (Google DeepMind × Forever 22).
 * 2. Visualizes live connection status (Idle, Connecting, Listening, Speaking, Analyzing).
 * 3. Shows active language badge and non-financial advice regulatory disclaimer badge.
 * 4. Provides buttons to toggle the Safety Boundary modal and Audit Trail log viewer.
 * =============================================================================
 */

import React from "react";
import { ShieldCheck, Activity, Terminal, Info, Globe, Sparkles } from "lucide-react";
import { SessionStatus } from "../types/guide";
import { SupportedLanguage } from "../config/appConfig";
import { logFunctionCall } from "../utils/logger";

interface HeaderProps {
  status: SessionStatus;
  currentLanguage: SupportedLanguage;
  onOpenSafetyModal: () => void;
  onOpenAuditLog: () => void;
}

/**
 * Header component rendering the persistent navigation bar and runtime status.
 *
 * @param props - HeaderProps containing status, language, and modal handlers.
 * @returns React.JSX.Element
 */
export function Header({
  status,
  currentLanguage,
  onOpenSafetyModal,
  onOpenAuditLog,
}: HeaderProps): React.JSX.Element {
  logFunctionCall("HEADER", "render", { status, language: currentLanguage.code });

  /**
   * Resolves visual badge styling and label based on active session state.
   */
  const getStatusBadge = () => {
    switch (status) {
      case "listening":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400 animate-pulse",
          text: "Live • Listening",
        };
      case "speaking":
        return {
          bg: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
          dot: "bg-cyan-400 animate-ping",
          text: "Live • Speaking (Barge-in ready)",
        };
      case "analyzing":
        return {
          bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
          dot: "bg-amber-400 animate-spin",
          text: "Analyzing Screen...",
        };
      case "connecting":
        return {
          bg: "bg-blue-500/15 border-blue-500/40 text-blue-300",
          dot: "bg-blue-400 animate-pulse",
          text: "Connecting Live API...",
        };
      case "error":
        return {
          bg: "bg-rose-500/15 border-rose-500/40 text-rose-400",
          dot: "bg-rose-400",
          text: "Live API Reconnecting",
        };
      default:
        return {
          bg: "bg-slate-800/80 border-slate-700/60 text-slate-400",
          dot: "bg-slate-500",
          text: "Standby • Click Start Guide",
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <Globe className="w-5 h-5" />
            <Sparkles className="w-3.5 h-3.5 absolute -top-1 -right-1 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">
                Language Bridge
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border border-cyan-500/30 bg-cyan-950/50 text-cyan-300">
                Gemini Live API
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multilingual Visual Voice Guide • DeepMind × Forever 22 Hackathon
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* Active Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${badge.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span>{badge.text}</span>
          </div>

          {/* Current Language Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-300">
            <span className="text-slate-400">Language:</span>
            <span className="font-semibold text-cyan-400">
              {currentLanguage.nativeName} ({currentLanguage.code})
            </span>
          </div>

          {/* Audit Log Trigger */}
          <button
            onClick={() => {
              logFunctionCall("HEADER", "openAuditLog", {});
              onOpenAuditLog();
            }}
            title="Inspect System Logs & GenAI Parameter Traces"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-850 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">System Trace</span>
          </button>

          {/* Safety & Compliance Modal Trigger */}
          <button
            onClick={() => {
              logFunctionCall("HEADER", "openSafetyModal", {});
              onOpenSafetyModal();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-300 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trust & Safety</span>
          </button>
        </div>
      </div>
    </header>
  );
}
