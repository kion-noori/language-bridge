/**
 * @file buttonHighlightDetector.ts
 * =============================================================================
 * MULTILINGUAL BUTTON MENTION DETECTOR & TARGET NORMALIZER
 * =============================================================================
 * This utility inspects real-time agent transcripts, spoken responses, and
 * guided action advice to detect when the agent is guiding the user toward a
 * specific interactive button in the Coinbase Sandbox (e.g. "Preview Buy",
 * "$50", or "Buy").
 *
 * Why This Feature Exists:
 * Non-native speakers and immigrants often experience cognitive overload
 * when attempting to match spoken instructions in their native language
 * (e.g., Farsi: "روی دکمه پیش‌نمایش خرید کلیک کنید" or Spanish: "Haz clic en
 * Vista Previa") with an unfamiliar English interface.
 *
 * Supported Target Buttons:
 * 1. "preview_buy" : The primary "Preview Buy" action button on the input screen.
 * 2. "buy_now"     : The critical "Buy now" commitment button on the preview screen.
 * 3. "preset_50"   : The $50 preset purchase amount button.
 * 4. "preset_10"   : The $10 preset purchase amount button.
 * 5. "preset_25"   : The $25 preset purchase amount button.
 * 6. "preset_100"  : The $100 preset purchase amount button.
 * 7. "edit_amount" : The "Edit Amount" modifier button on the preview screen.
 *
 * Priority & Disambiguation Rules:
 * - "Preview Buy" contains the substring "Buy", and Farsi "پیش‌نمایش خرید"
 *   contains "خرید". The detector specifically matches full phrases first so
 *   "Preview Buy" is never prematurely classified as "Buy now".
 * - Persian/Arabic numbers (e.g. ۵۰, ۱۰, ۲۵, ۱۰۰) are normalized alongside
 *   Western numerals (50, 10, 25, 100).
 * - Exact canonical button names ("Preview Buy", "$50", "Buy", "Buy now") are
 *   supported directly.
 * =============================================================================
 */

import { HighlightedButtonTarget } from "../types/guide";
import { logFunctionCall } from "./logger";

/**
 * Normalizes Eastern Arabic / Persian numerals to standard Western digits.
 * Example: "۵۰" -> "50", "۱۰" -> "10".
 *
 * @param str - Input string with possible Persian or Arabic numerals.
 * @returns String with normalized digits.
 */
export function normalizeNumerals(str: string): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result
      .replaceAll(persianDigits[i], String(i))
      .replaceAll(arabicDigits[i], String(i));
  }
  return result;
}

/**
 * Maps arbitrary button aliases or explicit names to the canonical target enum.
 *
 * @param input - Raw identifier or button name.
 * @returns Canonical HighlightedButtonTarget or null.
 */
export function normalizeButtonTarget(
  input?: string | null
): HighlightedButtonTarget | null {
  if (!input) return null;
  const cleaned = normalizeNumerals(input.trim().toLowerCase());

  logFunctionCall("BUTTON_HIGHLIGHT_DETECTOR", "normalizeButtonTarget", { input });

  switch (cleaned) {
    case "preview_buy":
    case "preview buy":
    case "preview":
    case "preview order":
    case "پیش‌نمایش خرید":
    case "پیش نمایش خرید":
    case "پیش‌نمایش":
    case "پیش نمایش":
      return "preview_buy";

    case "buy_now":
    case "buy now":
    case "buy":
    case "خرید":
    case "خرید اکنون":
    case "خرید الان":
    case "comprar":
      return "buy_now";

    case "preset_50":
    case "50":
    case "$50":
    case "50$":
      return "preset_50";

    case "preset_10":
    case "10":
    case "$10":
    case "10$":
      return "preset_10";

    case "preset_25":
    case "25":
    case "$25":
    case "25$":
      return "preset_25";

    case "preset_100":
    case "100":
    case "$100":
    case "100$":
      return "preset_100";

    case "edit_amount":
    case "edit amount":
    case "edit":
    case "ویرایش":
    case "ویرایش مبلغ":
      return "edit_amount";

    case "continue":
    case "دکمه ادامه":
    case "ادامه":
    case "continuar":
    case "متابعة":
      return "continue";

    default:
      return null;
  }
}

/**
 * Inspects a block of spoken text or guidance advice to detect if a button is mentioned.
 * Checks primary text (native language) as well as secondary text (English translation).
 *
 * @param primaryText - The primary spoken or transcribed agent text (e.g. Farsi, Spanish).
 * @param secondaryText - Optional secondary English translation or explanation.
 * @returns Target button enum or null if no interactive button was mentioned.
 */
export function detectMentionedButton(
  primaryText?: string | null,
  secondaryText?: string | null
): HighlightedButtonTarget | null {
  if (!primaryText && !secondaryText) return null;

  const rawCombined = `${primaryText || ""} ${secondaryText || ""}`;
  const normalized = normalizeNumerals(rawCombined.toLowerCase());

  logFunctionCall("BUTTON_HIGHLIGHT_DETECTOR", "detectMentionedButton", {
    preview: rawCombined.slice(0, 80),
  });

  // 1. Check for "Preview Buy" FIRST before generic "Buy"
  // Handles English, Persian, Spanish, Arabic, etc.
  const previewPatterns = [
    /\bpreview\s*buy\b/i,
    /\bpreview\s*order\b/i,
    /\bpreview\s*button\b/i,
    /\bpreview\b/i,
    /پیش‌?\s*نمایش\s*خرید/i,
    /پیش‌?\s*نمایش/i,
    /دکمه\s*آبی/i,
    /دکمه\s*ابی/i,
    /vista\s*previa/i,
    /previsualizar/i,
    /معاينة\s*الشراء/i,
    /معاينة/i,
    /पूर्वावलोकन/i,
    /xem\s*trước/i,
    /预览购买/i,
    /预览/i,
  ];

  for (const pattern of previewPatterns) {
    if (pattern.test(normalized)) {
      return "preview_buy";
    }
  }

  // 2. Check for Preset Amount Buttons ($50, $10, $25, $100)
  // Check $50
  if (
    /(?:\$50|50\$|50\s*dollars?|50\s*usd|50\s*دلار|پنجاه\s*دلار|cincuenta\s*dólares|\b50\b)/i.test(
      normalized
    ) &&
    /(\$50|50\$|dollar|دلار|preset|button|دکمه|مبلغ|گزینه|amount|select|click)/i.test(
      normalized
    )
  ) {
    return "preset_50";
  }

  // Check $10
  if (
    /(?:\$10|10\$|10\s*dollars?|10\s*usd|10\s*دلار|ده\s*دلار|diez\s*dólares|\b10\b)/i.test(
      normalized
    ) &&
    /(\$10|10\$|dollar|دلار|preset|button|دکمه|مبلغ|گزینه|amount|select|click)/i.test(
      normalized
    )
  ) {
    return "preset_10";
  }

  // Check $25
  if (
    /(?:\$25|25\$|25\s*dollars?|25\s*usd|25\s*دلار|بیست\s*و\s*پنج\s*دلار|\b25\b)/i.test(
      normalized
    ) &&
    /(\$25|25\$|dollar|دلار|preset|button|دکمه|مبلغ|گزینه|amount|select|click)/i.test(
      normalized
    )
  ) {
    return "preset_25";
  }

  // Check $100
  if (
    /(?:\$100|100\$|100\s*dollars?|100\s*usd|100\s*دلار|صد\s*دلار|cien\s*dólares|\b100\b)/i.test(
      normalized
    ) &&
    /(\$100|100\$|dollar|دلار|preset|button|دکمه|مبلغ|گزینه|amount|select|click)/i.test(
      normalized
    )
  ) {
    return "preset_100";
  }

  // 3. Check for "Edit Amount"
  const editPatterns = [
    /\bedit\s*amount\b/i,
    /ویرایش\s*مبلغ/i,
    /تغییر\s*مبلغ/i,
    /editar\s*monto/i,
    /تعديل\s*المبلغ/i,
  ];

  for (const pattern of editPatterns) {
    if (pattern.test(normalized)) {
      return "edit_amount";
    }
  }

  // 4. Check for "Buy" / "Buy now" commitment button (only explicit button or action)
  const buyPatterns = [
    /\bbuy\s*now\b/i,
    /\bbuy\s*button\b/i,
    /\bclick\s*(?:the\s*)?buy\b/i,
    /\btap\s*(?:the\s*)?buy\b/i,
    /\bpress\s*(?:the\s*)?buy\b/i,
    /\bconfirm\s*(?:the\s*)?buy\b/i,
    /\bgreen\s*button\b/i,
    /\bbutton\s*(?:labeled|named)?\s*buy\b/i,
    /خرید\s*اکنون/i,
    /خرید\s*الان/i,
    /خرید\s*نهایی/i,
    /دکمه\s*خرید/i,
    /دکمه\s*سبز/i,
    /تایید\s*خرید/i,
    /ثبت\s*سفارش/i,
    /روی\s*(?:دکمه\s*)?خرید\s*(?:کلیک|بزنید|بفشارید)/i,
    /comprar\s*ahora/i,
    /bot[oó]n\s*(?:de\s*)?compra/i,
    /bot[oó]n\s*comprar/i,
    /clic\s*en\s*comprar/i,
    /bot[oó]n\s*verde/i,
    /شراء\s*الآن/i,
    /زر\s*الشراء/i,
    /زر\s*أخضر/i,
    /اضغط\s*شراء/i,
    /खरीदें\s*बटन/i,
    /mua\s*ngay/i,
    /nút\s*mua/i,
    /nút\s*màu\s*xanh/i,
    /立即购买/i,
    /购买按钮/i,
    /点击购买/i,
    /绿色按钮/i,
  ];

  for (const pattern of buyPatterns) {
    if (pattern.test(normalized)) {
      return "buy_now";
    }
  }

  // Also match exact single-word button label "buy" or "خرید" if given alone or as explicit button target
  if (
    normalized === "buy" ||
    normalized === "buy now" ||
    normalized === "خرید" ||
    normalized === "خرید اکنون"
  ) {
    return "buy_now";
  }

  // 5. Check for "Continue" (e.g. on Benefits Application or general forms)
  const continuePatterns = [
    /\bcontinue\b/i,
    /\bcontinue\s*button\b/i,
    /\bclick\s*continue\b/i,
    /دکمه\s*ادامه/i,
    /ادامه\s*دهید/i,
    /ادامه/i,
    /continuar/i,
    /متابعة/i,
    /जारी\s*रखें/i,
    /tiếp\s*tục/i,
    /继续/i,
  ];

  for (const pattern of continuePatterns) {
    if (pattern.test(normalized)) {
      return "continue";
    }
  }

  return null;
}
