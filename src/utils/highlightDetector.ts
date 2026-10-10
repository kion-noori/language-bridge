/**
 * @file highlightDetector.ts
 * =============================================================================
 * ACCURATE BUTTON & AMOUNT HIGHLIGHT DETECTOR
 * =============================================================================
 * This utility parses spoken utterances or agent instructions across multiple
 * languages (English, Persian/Farsi, Spanish, etc.) and accurately detects whether
 * the agent is actively guiding the user toward a specific interactive button
 * or field on the Coinbase Sandbox.
 *
 * Specific Fixes:
 * 1. Strict regex & boundary token matching for amount numbers (preventing false
 *    positives like substring "ده" in Persian verbs "دهید" / "می‌دهد" which caused
 *    the wrong $10 button to highlight).
 * 2. Accurate prioritization: Action buttons ("Preview Buy", "Buy now") take
 *    precedence when the agent guides an action step.
 * 3. Exact matching for "$50" (the primary demo preset) and other amounts.
 * =============================================================================
 */

import { logFunctionCall } from "./logger";

export type HighlightTargetId =
  | "preview_buy"
  | "buy_now"
  | "amount_50"
  | "amount_25"
  | "amount_10"
  | "amount_100"
  | "payment_method";

/**
 * Inspects a text string from the agent transcript or next step advice and resolves
 * which UI element on the Coinbase Sandbox should be highlighted.
 *
 * @param text - Spoken utterance, transcript, or instruction string.
 * @param currentStep - Current step in the Coinbase flow ('input' | 'preview' | 'success').
 * @returns The resolved HighlightTargetId or null if no specific button is mentioned.
 */
export function detectHighlightTarget(
  text: string | undefined | null,
  currentStep?: "input" | "preview" | "success"
): HighlightTargetId | null {
  logFunctionCall("HIGHLIGHT_DETECTOR", "detectHighlightTarget", {
    text: text?.slice(0, 80),
    currentStep,
  });

  if (!text) return null;
  const lower = text.toLowerCase();

  // 1. High Priority: "Preview Buy" button mentions (English, Farsi, Spanish)
  if (
    lower.includes("preview buy") ||
    lower.includes("preview") ||
    lower.includes("پیش‌نمایش") ||
    lower.includes("پیش نمایش") ||
    lower.includes("vista previa") ||
    lower.includes("معاينة") ||
    lower.includes("önizleme") ||
    lower.includes("دکمه آبی") ||
    lower.includes("blue button")
  ) {
    return "preview_buy";
  }

  // 2. High Priority: "Buy now" / "Buy" button mentions
  if (
    lower.includes("buy now") ||
    lower.includes("tap buy") ||
    lower.includes("click buy") ||
    lower.includes("دکمه خرید") ||
    lower.includes("تایید خرید") ||
    lower.includes("ثبت خرید") ||
    lower.includes("comprar ahora") ||
    lower.includes("شراء الآن")
  ) {
    if (currentStep === "preview") {
      return "buy_now";
    }
    return "preview_buy";
  }

  // 3. Amount Presets - Strict token & currency boundaries (Strictly avoid substring collisions)
  // Check $50 preset (Default demo flow amount)
  if (
    /\$50\b/.test(lower) ||
    /\b50\s*(?:dollar|dollars|usd|دلار)\b/i.test(lower) ||
    lower.includes("50 دلار") ||
    lower.includes("پنجاه دلار") ||
    lower.includes("۵۰ دلار") ||
    lower.includes("cincuenta dólares") ||
    lower.includes("خرید ۵۰")
  ) {
    return "amount_50";
  }

  // Check $25 preset
  if (
    /\$25\b/.test(lower) ||
    /\b25\s*(?:dollar|dollars|usd|دلار)\b/i.test(lower) ||
    lower.includes("25 دلار") ||
    lower.includes("بیست و پنج دلار") ||
    lower.includes("۲۵ دلار")
  ) {
    return "amount_25";
  }

  // Check $100 preset
  if (
    /\$100\b/.test(lower) ||
    /\b100\s*(?:dollar|dollars|usd|دلار)\b/i.test(lower) ||
    lower.includes("100 دلار") ||
    lower.includes("صد دلار") ||
    lower.includes("۱۰۰ دلار")
  ) {
    return "amount_100";
  }

  // Check $10 preset (MUST be strict to never match Persian verb endings like "دهید")
  if (
    /\$10\b/.test(lower) ||
    /\b10\s*(?:dollar|dollars|usd|دلار)\b/i.test(lower) ||
    lower.includes("10 دلار") ||
    lower.includes("۱۰ دلار") ||
    lower.includes("ده دلار") ||
    lower.includes("diez dólares")
  ) {
    return "amount_10";
  }

  // 4. Payment method dropdown
  if (
    lower.includes("payment method") ||
    lower.includes("روش پرداخت") ||
    lower.includes("حساب بانکی") ||
    lower.includes("chase bank") ||
    lower.includes("método de pago")
  ) {
    return "payment_method";
  }

  // 5. Contextual fallback for generic "buy" or "خرید"
  if (lower.includes("buy") || lower.includes("خرید")) {
    return currentStep === "preview" ? "buy_now" : "preview_buy";
  }

  return null;
}
