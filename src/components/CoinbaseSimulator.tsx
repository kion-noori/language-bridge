/**
 * @file CoinbaseSimulator.tsx
 * =============================================================================
 * INTERACTIVE COINBASE BITCOIN BUY SCREEN SIMULATOR
 * =============================================================================
 * This component provides an authentic, self-contained simulation of the
 * Coinbase crypto buy flow.
 *
 * Why This Exists for the Hackathon:
 * 1. Evaluators and judges need to test the "buy a small amount of Bitcoin safely"
 *    demo flow immediately, without needing an actual Coinbase account, risking
 *    real money, or configuring separate browser windows.
 * 2. It accurately replicates the exact English-language financial friction points:
 *    - Unfamiliar jargon: "Slippage", "Spread", "Network Fee", "One-time purchase"
 *    - Dense fee breakdowns: Coinbase fee vs. miner network cost
 *    - High-stakes commitment: "Buy Now" vs. "Preview Order"
 * 3. Provides an integrated canvas capture method so the Guide Agent can inspect
 *    the screen either automatically at 1 FPS or on demand.
 * =============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Bitcoin,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Building2,
  RefreshCw,
  CheckCircle,
  Camera,
  ChevronRight,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { CoinbaseScreenState, HighlightedButtonTarget } from "../types/guide";
import { logFunctionCall } from "../utils/logger";
import { normalizeButtonTarget } from "../utils/buttonHighlightDetector";
import { CoinbaseHighlightOverlay } from "./CoinbaseHighlightOverlay";
import { APP_CONFIG } from "../config/appConfig";
import { useViewportVisibility } from "../utils/useViewportVisibility";

interface CoinbaseSimulatorProps {
  onCaptureScreen?: (dataUrl: string) => void;
  highlightedElement?: string | null;
  onViewportChange?: (inView: boolean) => void;
}

const BTC_PRICE_USD = 67420;

/**
 * CoinbaseSimulator component providing realistic crypto trading interface.
 *
 * @param props - CoinbaseSimulatorProps
 * @returns React.JSX.Element
 */
export function CoinbaseSimulator({
  onCaptureScreen,
  highlightedElement,
  onViewportChange,
}: CoinbaseSimulatorProps): React.JSX.Element {
  const [step, setStep] = useState<"input" | "preview" | "success">("input");
  const [selectedAsset, setSelectedAsset] = useState<"BTC" | "ETH" | "SOL">("BTC");
  const [usdAmount, setUsdAmount] = useState<number>(50);
  const [customAmountStr, setCustomAmountStr] = useState<string>("50");
  const [paymentMethod, setPaymentMethod] = useState<string>("Chase Bank Checking (...8842)");
  const [activeHighlight, setActiveHighlight] = useState<HighlightedButtonTarget | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);

  /**
   * Tracks whether the built-in Coinbase Sandbox is in the viewport (scrolled into view).
   * STRICT REQUIREMENT: Defaults to false on load. Only becomes true when the user
   * scrolls the sandbox into view.
   */
  const isSandboxInView = useViewportVisibility(containerRef, {
    threshold: 0.15,
    onVisibilityChange: (inView) => {
      logFunctionCall("COINBASE_SIMULATOR", "onVisibilityChange", { inView });
      onViewportChange?.(inView);
      if (inView) {
        // Automatically capture and feed to guide without requiring "Feed to Guide" click
        const img = captureUiAsImage();
        if (img && onCaptureScreen) {
          onCaptureScreen(img);
        }
      }
    },
  });

  // Whenever step, usdAmount, or selectedAsset changes while in viewport, auto-update the guide feed
  useEffect(() => {
    if (isSandboxInView) {
      const img = captureUiAsImage();
      if (img && onCaptureScreen) {
        onCaptureScreen(img);
      }
    }
  }, [isSandboxInView, step, usdAmount, selectedAsset]);

  /**
   * Applies a temporary visual pulsing highlight and glowing outline around
   * the targeted button for 4-5 seconds (APP_CONFIG.highlight.durationMs: 4500ms),
   * then makes it disappear cleanly.
   *
   * @param target - The normalized button target or null.
   */
  const applyTemporaryHighlight = (target: HighlightedButtonTarget | null) => {
    logFunctionCall("COINBASE_SIMULATOR", "applyTemporaryHighlight", { target });
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
      logFunctionCall("COINBASE_SIMULATOR", "clearHighlightTimeout", { target });
      setActiveHighlight(null);
      highlightTimerRef.current = null;
    }, APP_CONFIG.highlight.durationMs);
  };

  // Sync with prop updates
  useEffect(() => {
    if (highlightedElement) {
      const normalized = normalizeButtonTarget(highlightedElement);
      applyTemporaryHighlight(normalized);
    }
  }, [highlightedElement]);

  // Support direct window custom events for flexible cross-component triggering
  useEffect(() => {
    const handleHighlightEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ button: string }>;
      if (customEvt.detail?.button) {
        const normalized = normalizeButtonTarget(customEvt.detail.button);
        applyTemporaryHighlight(normalized);
      }
    };

    window.addEventListener("coinbase-highlight-button", handleHighlightEvent);
    return () => {
      window.removeEventListener("coinbase-highlight-button", handleHighlightEvent);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Dynamic fee calculation
  const coinbaseFee = usdAmount > 0 ? (usdAmount <= 25 ? 1.49 : 1.99) : 0;
  const networkFee = 0.85;
  const netPurchaseUsd = Math.max(0, usdAmount - coinbaseFee);
  const cryptoQuantity = netPurchaseUsd > 0 ? netPurchaseUsd / BTC_PRICE_USD : 0;

  logFunctionCall("COINBASE_SIMULATOR", "render", {
    step,
    selectedAsset,
    usdAmount,
  });

  /**
   * Captures the simulated Coinbase UI container into a base64 JPEG data URL.
   */
  const captureUiAsImage = (): string | null => {
    try {
      const container = containerRef.current;
      if (!container) return null;

      // Render a high-fidelity snapshot onto an off-screen HTML5 Canvas
      const width = 420;
      const height = 540;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Draw background
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, width, height);

      // Header
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, 55);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("Coinbase", 20, 34);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Trade • Buy Bitcoin (BTC)`, 110, 34);

      if (step === "input") {
        // Asset Price header
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`$${usdAmount}.00`, 20, 105);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px sans-serif";
        ctx.fillText(`≈ ${cryptoQuantity.toFixed(6)} BTC`, 20, 130);

        ctx.fillStyle = "#22c55e";
        ctx.font = "11px sans-serif";
        ctx.fillText(`BTC Price: $${BTC_PRICE_USD.toLocaleString()} (+2.4%)`, 20, 150);

        // Payment Method Box
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, 175, width - 40, 50);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.fillText("Pay with:", 32, 198);
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(paymentMethod, 32, 215);

        // Fees summary
        ctx.fillStyle = "#64748b";
        ctx.font = "11px sans-serif";
        ctx.fillText(`Coinbase Fee: $${coinbaseFee.toFixed(2)}`, 20, 260);
        ctx.fillText(`Est. Network Miner Fee: $${networkFee.toFixed(2)}`, 20, 280);
        ctx.fillText(`Net Crypto Purchased: $${netPurchaseUsd.toFixed(2)}`, 20, 300);

        // Preview Buy Button
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(20, 350, width - 40, 48);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Preview Buy", width / 2, 380);
        ctx.textAlign = "left";

        // Warning
        ctx.fillStyle = "#f59e0b";
        ctx.font = "10px sans-serif";
        ctx.fillText("⚠️ Crypto purchases cannot be cancelled once placed.", 20, 430);
      } else if (step === "preview") {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Order Preview", 20, 90);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText("You are buying:", 20, 120);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`${cryptoQuantity.toFixed(6)} BTC`, 20, 145);

        // Breakdown box
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, 170, width - 40, 140);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText("Purchase Amount:", 35, 195);
        ctx.fillText("Coinbase Fee:", 35, 225);
        ctx.fillText("Network Fee:", 35, 255);
        ctx.fillText("Total USD Cost:", 35, 290);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText(`$${netPurchaseUsd.toFixed(2)}`, width - 35, 195);
        ctx.fillText(`$${coinbaseFee.toFixed(2)}`, width - 35, 225);
        ctx.fillText(`$${networkFee.toFixed(2)}`, width - 35, 255);
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`$${usdAmount.toFixed(2)}`, width - 35, 290);
        ctx.textAlign = "left";

        // Buy Now Button
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(20, 340, width - 40, 48);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Buy now", width / 2, 370);
        ctx.textAlign = "left";

        ctx.fillStyle = "#ef4444";
        ctx.font = "10px sans-serif";
        ctx.fillText("⚠️ Critical: Irreversible purchase. Price locks on tap.", 20, 420);
      } else {
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Order Placed Successfully", width / 2, 140);
        ctx.fillStyle = "#ffffff";
        ctx.font = "13px sans-serif";
        ctx.fillText(`You purchased ${cryptoQuantity.toFixed(6)} BTC`, width / 2, 170);
        ctx.textAlign = "left";
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      return dataUrl;
    } catch {
      return null;
    }
  };

  /**
   * Exports the current screen to the parent guide.
   */
  const handlePushToGuide = () => {
    logFunctionCall("COINBASE_SIMULATOR", "pushScreenToGuide", { step, usdAmount });
    const img = captureUiAsImage();
    if (img && onCaptureScreen) {
      onCaptureScreen(img);
    }
  };

  // Expose capture method via custom event or effect
  useEffect(() => {
    const handleGlobalCapture = () => {
      const img = captureUiAsImage();
      if (img && onCaptureScreen) {
        onCaptureScreen(img);
      }
    };
    window.addEventListener("request-screen-capture", handleGlobalCapture);
    return () => {
      window.removeEventListener("request-screen-capture", handleGlobalCapture);
    };
  });

  return (
    <div
      ref={containerRef}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col"
    >
      {/* Top simulated browser / app title bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-semibold text-slate-300 ml-2">
            coinbase.com/trade/buy
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSandboxInView ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] sm:text-[11px] font-semibold text-emerald-300"
              title="Coinbase Sandbox is visible in viewport; auto-feeding frames to guide without clicking"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>In View • Auto-Detected</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] sm:text-[11px] font-medium text-slate-400"
              title="Scroll down to bring Coinbase Sandbox into viewport"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Scroll into View to Feed</span>
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

      {/* Coinbase Branding & Ticker */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                <Bitcoin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 text-sm">Bitcoin</span>
                  <span className="text-xs text-slate-400 font-medium">BTC</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium">
                  ${BTC_PRICE_USD.toLocaleString()} • +2.4% today
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400">Order Type</span>
              <p className="text-xs font-semibold text-slate-200">One-time purchase</p>
            </div>
          </div>

          {/* STEP 1: Enter USD Amount */}
          {step === "input" && (
            <div className="mt-4 space-y-4">
              <div className="text-center py-2">
                <span className="text-xs text-slate-400 block mb-1">Buy Bitcoin</span>
                <div className="flex items-center justify-center text-3xl font-extrabold text-slate-100">
                  <span>${usdAmount}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono mt-1 block">
                  ≈ {cryptoQuantity.toFixed(6)} BTC
                </span>
              </div>

              {/* Amount preset buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((preset) => {
                  const isPresetHighlighted = activeHighlight === `preset_${preset}`;
                  return (
                    <div key={preset} className="relative">
                      {isPresetHighlighted && (
                        <CoinbaseHighlightOverlay
                          variant="preset"
                          color="cyan"
                          targetName={`$${preset}`}
                        />
                      )}
                      <button
                        onClick={() => {
                          logFunctionCall("COINBASE_SIMULATOR", "selectPresetAmount", {
                            preset,
                          });
                          setUsdAmount(preset);
                          setCustomAmountStr(String(preset));
                        }}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          usdAmount === preset
                            ? "bg-cyan-600 text-white border-cyan-500 shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                        } ${
                          isPresetHighlighted
                            ? "ring-2 ring-cyan-400 border-cyan-400 font-bold scale-[1.04]"
                            : ""
                        }`}
                      >
                        ${preset}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Selector */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Payment Method
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-slate-200 font-medium truncate">
                      {paymentMethod}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Fee Transparency Box (The dense English friction point) */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Coinbase Fee</span>
                  <span className="text-slate-200 font-medium">
                    ${coinbaseFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Estimated Network Fee</span>
                  <span className="text-slate-200 font-medium">
                    ${networkFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/80 pt-1.5 font-semibold">
                  <span className="text-slate-300">Total Purchase</span>
                  <span className="text-cyan-300 font-bold">${usdAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Irreversible purchase warning banner */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Orders cannot be reversed. Language Bridge will explain fees before you preview.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Preview Order */}
          {step === "preview" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-100">Order Preview</h4>
                <div className="relative">
                  {activeHighlight === "edit_amount" && (
                    <CoinbaseHighlightOverlay
                      variant="inline"
                      color="cyan"
                      targetName="Edit Amount"
                    />
                  )}
                  <button
                    onClick={() => {
                      logFunctionCall("COINBASE_SIMULATOR", "clickEditAmount", {});
                      setStep("input");
                    }}
                    className={`text-xs text-cyan-400 hover:underline transition-all ${
                      activeHighlight === "edit_amount"
                        ? "font-bold ring-2 ring-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40 scale-105"
                        : ""
                    }`}
                  >
                    Edit Amount
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block">You are buying</span>
                <span className="text-2xl font-extrabold text-slate-100 font-mono my-1 block">
                  {cryptoQuantity.toFixed(6)} BTC
                </span>
                <span className="text-xs text-slate-400">
                  from Coinbase Inc. at locked rate
                </span>
              </div>

              {/* Full line item breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Purchase Amount</span>
                  <span className="text-slate-200 font-medium">
                    ${netPurchaseUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Coinbase Processing Fee</span>
                  <span className="text-amber-400 font-semibold">
                    ${coinbaseFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Miner Network Fee</span>
                  <span className="text-amber-400 font-semibold">
                    ${networkFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Payment Method</span>
                  <span className="text-slate-200">{paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-slate-100">
                  <span>Total Debit</span>
                  <span className="text-cyan-400 text-sm">${usdAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  Critical Action: Tapping "Buy now" commits real funds. The voice guide will ask for verbal consent first.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Order Completed */}
          {step === "success" && (
            <div className="mt-8 text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-100">
                  Bitcoin Purchase Complete!
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  You successfully acquired {cryptoQuantity.toFixed(6)} BTC safely.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-left">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Charged:</span>
                  <span className="text-slate-200 font-semibold">${usdAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Delivered to:</span>
                  <span className="text-slate-200">Coinbase BTC Wallet</span>
                </div>
              </div>

              <button
                onClick={() => setStep("input")}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors"
              >
                Start Another Demo Purchase
              </button>
            </div>
          )}
        </div>

        {/* Action Button Area */}
        <div className="mt-6 pt-3 border-t border-slate-800/80">
          {step === "input" && (
            <div className="relative">
              {activeHighlight === "preview_buy" && (
                <CoinbaseHighlightOverlay
                  variant="action"
                  color="cyan"
                  targetName="Preview Buy"
                />
              )}
              <button
                onClick={() => {
                  logFunctionCall("COINBASE_SIMULATOR", "clickPreviewBuy", {
                    usdAmount,
                  });
                  setStep("preview");
                  setTimeout(handlePushToGuide, 150);
                }}
                className={`w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 ${
                  activeHighlight === "preview_buy"
                    ? "ring-4 ring-cyan-300 ring-offset-2 ring-offset-slate-900 shadow-[0_0_35px_rgba(34,211,238,0.95)] scale-[1.01]"
                    : ""
                }`}
              >
                <span>Preview Buy</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "preview" && (
            <div className="relative">
              {activeHighlight === "buy_now" && (
                <CoinbaseHighlightOverlay
                  variant="action"
                  color="emerald"
                  targetName="Buy now"
                />
              )}
              <button
                onClick={() => {
                  logFunctionCall("COINBASE_SIMULATOR", "clickBuyNow", {
                    cryptoQuantity,
                    usdAmount,
                  });
                  setStep("success");
                  setTimeout(handlePushToGuide, 150);
                }}
                className={`w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 ${
                  activeHighlight === "buy_now"
                    ? "ring-4 ring-emerald-300 ring-offset-2 ring-offset-slate-900 shadow-[0_0_35px_rgba(52,211,153,0.95)] scale-[1.01]"
                    : ""
                }`}
              >
                <span>Buy now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
