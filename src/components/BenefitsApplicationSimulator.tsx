/**
 * @file BenefitsApplicationSimulator.tsx
 * =============================================================================
 * INTERACTIVE MEDICAID-STYLE BENEFITS APPLICATION DEMO SCREEN
 * =============================================================================
 * This component provides an authentic, clean simulation of a government public
 * health benefits application (Medicaid / State Health Services).
 *
 * Why This Exists:
 * Immigrants, non-native speakers, and elderly applicants frequently struggle
 * with complex English government portals containing intimidating legal terms:
 * "Household Size", "Monthly Gross Earned Income", "MAGI", "Penalty of Perjury",
 * and employment classification dropdowns.
 *
 * Key Fields Implemented:
 * 1. Household Size (1, 2, 3, 4, 5+ persons)
 * 2. Monthly Gross Income ($1,200, $1,850, $2,400, $3,200, custom)
 * 3. Employment Status (Employed, Self-Employed, Unemployed, Retired)
 * 4. Continue Action Button (with temporary visual highlight support)
 *
 * Multimodal & Agent Integration:
 * - Employs the identical viewport-based auto-detection (`useViewportVisibility`)
 *   as the Coinbase Sandbox: strictly defaults to `false` on initial load, and
 *   automatically feeds screen frames as soon as it is scrolled into view.
 * - Renders a high-fidelity off-screen canvas snapshot for Gemini Vision ingestion.
 * - Allows the agent to apply the strict 4-Stage Trust Loop:
 *   1. Explain fields in native language
 *   2. Surface legal/eligibility rules (gross vs. net, proof of income)
 *   3. Ask explicit verbal confirmation
 *   4. Guide clicking the "Continue" button safely
 * =============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Users,
  DollarSign,
  Briefcase,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  Camera,
  Eye,
  EyeOff,
  Building,
  Info,
} from "lucide-react";
import { HighlightedButtonTarget } from "../types/guide";
import { logFunctionCall } from "../utils/logger";
import { normalizeButtonTarget } from "../utils/buttonHighlightDetector";
import { CoinbaseHighlightOverlay } from "./CoinbaseHighlightOverlay";
import { APP_CONFIG } from "../config/appConfig";
import { useViewportVisibility } from "../utils/useViewportVisibility";

interface BenefitsApplicationSimulatorProps {
  onCaptureScreen?: (dataUrl: string) => void;
  highlightedElement?: string | null;
  onViewportChange?: (inView: boolean) => void;
}

const EMPLOYMENT_OPTIONS = [
  "Employed (W-2 Wages)",
  "Self-Employed / Gig Worker",
  "Unemployed (Seeking Work)",
  "Retired / Not in Labor Force",
] as const;

/**
 * BenefitsApplicationSimulator component providing a Medicaid income verification screen.
 *
 * @param props - BenefitsApplicationSimulatorProps
 * @returns React.JSX.Element
 */
export function BenefitsApplicationSimulator({
  onCaptureScreen,
  highlightedElement,
  onViewportChange,
}: BenefitsApplicationSimulatorProps): React.JSX.Element {
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(1850);
  const [employmentStatus, setEmploymentStatus] = useState<string>("Employed (W-2 Wages)");
  const [step, setStep] = useState<"form" | "summary">("form");
  const [activeHighlight, setActiveHighlight] = useState<HighlightedButtonTarget | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);

  /**
   * Tracks whether the Benefits Application is visible in the browser viewport.
   * STRICT REQUIREMENT: Defaults to false on initial load.
   */
  const isBenefitsInView = useViewportVisibility(containerRef, {
    threshold: 0.15,
    onVisibilityChange: (inView) => {
      logFunctionCall("BENEFITS_SIMULATOR", "onVisibilityChange", { inView });
      onViewportChange?.(inView);
      if (inView) {
        const img = captureUiAsImage();
        if (img && onCaptureScreen) {
          onCaptureScreen(img);
        }
      }
    },
  });

  // Dynamic state Medicaid guideline estimate (~138% FPL for household)
  const estFplThreshold = householdSize === 1 ? 1732 : householdSize === 2 ? 2351 : householdSize === 3 ? 2970 : 3589;
  const isLikelyEligible = monthlyIncome <= estFplThreshold;

  logFunctionCall("BENEFITS_SIMULATOR", "render", {
    householdSize,
    monthlyIncome,
    employmentStatus,
    step,
    isBenefitsInView,
  });

  /**
   * Captures the simulated government application UI onto an HTML5 canvas.
   */
  const captureUiAsImage = (): string | null => {
    try {
      const container = containerRef.current;
      if (!container) return null;

      const width = 420;
      const height = 540;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Background
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, width, height);

      // Government header banner
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, 55);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("benefits.gov • Medicaid / CHIP Portal", 20, 34);

      if (step === "form") {
        // Form Section Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 17px sans-serif";
        ctx.fillText("Section 3: Household & Monthly Income", 20, 95);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText("State Health Coverage Assistance Application", 20, 118);

        // Field 1: Household Size Box
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, 140, width - 40, 52);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px sans-serif";
        ctx.fillText("1. Total Household Size:", 32, 162);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(`${householdSize} Persons (Self + Dependents)`, 32, 182);

        // Field 2: Monthly Gross Income Box
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, 205, width - 40, 52);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px sans-serif";
        ctx.fillText("2. Monthly Gross Earned Income (Before Taxes):", 32, 227);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(`$${monthlyIncome.toLocaleString()} / month`, 32, 247);

        // Field 3: Employment Status Box
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, 270, width - 40, 52);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px sans-serif";
        ctx.fillText("3. Primary Employment Classification:", 32, 292);
        ctx.fillStyle = "#ffffff";
        ctx.font = "13px sans-serif";
        ctx.fillText(employmentStatus, 32, 312);

        // Legal Declaration Warning
        ctx.fillStyle = "#f59e0b";
        ctx.font = "10px sans-serif";
        ctx.fillText("⚠️ Notice: Income declarations are subject to state electronic tax cross-check.", 20, 355);
        ctx.fillText("   Under penalty of perjury, ensure all reported figures are accurate.", 20, 370);

        // Continue Button
        ctx.fillStyle = "#0284c7"; // sky-600
        ctx.fillRect(20, 410, width - 40, 48);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Continue to Tax & Dependent Review", width / 2, 440);
        ctx.textAlign = "left";
      } else {
        // Summary Step
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 17px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Income Information Recorded", width / 2, 120);
        ctx.fillStyle = "#ffffff";
        ctx.font = "13px sans-serif";
        ctx.fillText(`Household of ${householdSize} • $${monthlyIncome}/mo reported`, width / 2, 150);
        ctx.textAlign = "left";

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, 180, width - 40, 120);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText(`Household Members: ${householdSize}`, 35, 210);
        ctx.fillText(`Reported Monthly Income: $${monthlyIncome}`, 35, 240);
        ctx.fillText(`Eligibility Status: Likely Meets 138% FPL`, 35, 270);
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      return dataUrl;
    } catch {
      return null;
    }
  };

  /**
   * Manually pushes current frame to guide.
   */
  const handlePushToGuide = () => {
    logFunctionCall("BENEFITS_SIMULATOR", "pushScreenToGuide", {
      householdSize,
      monthlyIncome,
    });
    const img = captureUiAsImage();
    if (img && onCaptureScreen) {
      onCaptureScreen(img);
    }
  };

  // Auto-feed frame to guide whenever values update while in viewport
  useEffect(() => {
    if (isBenefitsInView) {
      const img = captureUiAsImage();
      if (img && onCaptureScreen) {
        onCaptureScreen(img);
      }
    }
  }, [isBenefitsInView, householdSize, monthlyIncome, employmentStatus, step]);

  /**
   * Applies temporary visual highlight to target buttons for 4-5 seconds.
   */
  const applyTemporaryHighlight = (target: HighlightedButtonTarget | null) => {
    logFunctionCall("BENEFITS_SIMULATOR", "applyTemporaryHighlight", { target });
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }

    if (!target) {
      setActiveHighlight(null);
      return;
    }

    setActiveHighlight(target);

    highlightTimerRef.current = window.setTimeout(() => {
      setActiveHighlight(null);
      highlightTimerRef.current = null;
    }, APP_CONFIG.highlight.durationMs);
  };

  useEffect(() => {
    if (highlightedElement) {
      const normalized = normalizeButtonTarget(highlightedElement);
      applyTemporaryHighlight(normalized);
    }
  }, [highlightedElement]);

  return (
    <div
      ref={containerRef}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col"
    >
      {/* Top simulated browser title bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-semibold text-slate-300 ml-2 truncate">
            benefits.gov/health/medicaid/income
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isBenefitsInView ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] sm:text-[11px] font-semibold text-emerald-300"
              title="Benefits screen is visible in viewport; auto-feeding frames to guide"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>In View • Auto-Detected</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] sm:text-[11px] font-medium text-slate-400"
              title="Scroll down so the agent can see the benefits screen"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Scroll into View</span>
            </span>
          )}

          <button
            onClick={handlePushToGuide}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-[11px] font-medium text-cyan-300 transition-colors"
            title="Manual snapshot feed into Language Bridge"
          >
            <Camera className="w-3 h-3" />
            <span>Feed to Guide</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 text-sm">Medicaid Application</span>
                  <span className="text-[10px] bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                    SEC-03
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  State Health & Human Services • Income Review
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400">Step 3 of 5</span>
              <p className="text-xs font-semibold text-slate-200">Income Section</p>
            </div>
          </div>

          {step === "form" && (
            <div className="mt-4 space-y-4">
              {/* Field 1: Household Size */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Household Size</span>
                  </label>
                  <span className="text-[11px] text-cyan-300 font-bold font-mono">
                    {householdSize} {householdSize === 1 ? "Person" : "Persons"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Include yourself, your spouse, and legal tax dependents living with you.
                </p>

                {/* Number selector buttons */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((size) => (
                    <button
                      key={size}
                      onClick={() => setHouseholdSize(size)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        householdSize === size
                          ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {size === 5 ? "5+" : size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Monthly Income */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Monthly Gross Income</span>
                  </label>
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    ${monthlyIncome.toLocaleString()} / mo
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Total gross earnings before taxes, wage garnishments, or payroll deductions.
                </p>

                {/* Preset amount buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[1200, 1850, 2400, 3200].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setMonthlyIncome(amt)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        monthlyIncome === amt
                          ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Employment Status Dropdown/Selector */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Employment Status</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setEmploymentStatus(opt)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left border transition-all truncate ${
                        employmentStatus === opt
                          ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/60 font-semibold"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated FPL Indicator & Warning */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Est. 138% FPL Limit ({householdSize} persons)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    ${estFplThreshold.toLocaleString()} / mo
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">Preliminary Assessment:</span>
                  <span
                    className={`font-semibold ${
                      isLikelyEligible ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {isLikelyEligible
                      ? "Likely Income Eligible for Medicaid"
                      : "May Require State Subsidy Review"}
                  </span>
                </div>
              </div>

              {/* Legal Obligation Banner */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Language Bridge will review your gross income and household size with you before you continue.
                </span>
              </div>
            </div>
          )}

          {step === "summary" && (
            <div className="mt-8 text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-100">
                  Income Section Completed
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Household of {householdSize} with gross income ${monthlyIncome.toLocaleString()}/mo recorded safely.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-left space-y-1.5">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Household Size:</span>
                  <span className="text-slate-200 font-semibold">{householdSize} Persons</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Monthly Gross Income:</span>
                  <span className="text-slate-200 font-semibold">${monthlyIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Employment Status:</span>
                  <span className="text-slate-200 truncate max-w-[200px]">{employmentStatus}</span>
                </div>
              </div>

              <button
                onClick={() => setStep("form")}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors"
              >
                Edit Income Details
              </button>
            </div>
          )}
        </div>

        {/* Action Button Area */}
        <div className="mt-6 pt-3 border-t border-slate-800/80">
          {step === "form" && (
            <div className="relative">
              {activeHighlight === "continue" && (
                <CoinbaseHighlightOverlay
                  variant="action"
                  color="cyan"
                  targetName="Continue"
                />
              )}
              <button
                onClick={() => {
                  logFunctionCall("BENEFITS_SIMULATOR", "clickContinue", {
                    householdSize,
                    monthlyIncome,
                  });
                  setStep("summary");
                  setTimeout(handlePushToGuide, 150);
                }}
                className={`w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 ${
                  activeHighlight === "continue"
                    ? "ring-4 ring-cyan-300 ring-offset-2 ring-offset-slate-900 shadow-[0_0_35px_rgba(34,211,238,0.95)] scale-[1.01]"
                    : ""
                }`}
              >
                <span>Continue to Tax & Dependent Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
