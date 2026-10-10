/**
 * @file CoinbaseHighlightOverlay.tsx
 * =============================================================================
 * TEMPORARY VISUAL HIGHLIGHT & PULSING CIRCLE OVERLAY FOR COINBASE SANDBOX
 * =============================================================================
 * This component renders the temporary visual highlight (pulsing circle and
 * glowing outline) around buttons in the built-in Coinbase Sandbox when the
 * agent guides the user to a specific button.
 *
 * Requirements Met:
 * 1. Visual Presentation:
 *    - Draws an intense glowing outline around the target button.
 *    - Draws an animated concentric pulsing circle (ping radar wave) around the button.
 *    - Displays a pulsing target circle beacon at the corner of the button.
 * 2. Visual Polish:
 *    - Distinctive vibrant color palette:
 *      * Cyan glowing outline for "Preview Buy", preset buttons ($50, $10, etc.), and "Edit Amount".
 *      * Emerald glowing outline for "Buy now" (aligning with Coinbase's green confirmation button).
 * 3. Lifespan Discipline:
 *    - Active for 4–5 seconds (governed by APP_CONFIG.highlight.durationMs: 4500ms),
 *      after which it cleanly disappears.
 * 4. Isolation:
 *    - Purely on-screen DOM overlay; does not interfere with the offscreen canvas
 *      snapshot used for Gemini multimodal screen ingestion.
 * =============================================================================
 */

import React from "react";
import { logFunctionCall } from "../utils/logger";

interface CoinbaseHighlightOverlayProps {
  variant?: "action" | "preset" | "inline";
  color?: "cyan" | "emerald";
  targetName?: string;
}

/**
 * Renders an animated glowing outline and pulsing circle over a targeted button.
 *
 * @param props - CoinbaseHighlightOverlayProps
 * @returns React.JSX.Element
 */
export function CoinbaseHighlightOverlay({
  variant = "action",
  color = "cyan",
  targetName = "button",
}: CoinbaseHighlightOverlayProps): React.JSX.Element {
  logFunctionCall("COINBASE_HIGHLIGHT_OVERLAY", "render", {
    variant,
    color,
    targetName,
  });

  const isEmerald = color === "emerald";

  // Classes for glowing outline & animated ping waves based on variant
  const roundedClass =
    variant === "preset"
      ? "rounded-xl"
      : variant === "inline"
      ? "rounded-lg"
      : "rounded-xl";

  const glowBorder = isEmerald
    ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.95)]"
    : "border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.95)]";

  const pingBorder = isEmerald ? "border-emerald-400" : "border-cyan-400";
  const beaconColor = isEmerald ? "bg-emerald-400" : "bg-cyan-400";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-visible transition-opacity duration-300"
      aria-hidden="true"
    >
      {/* 1. Concentric pulsing circle / ping wave expanding outwards */}
      <span
        className={`absolute -inset-1.5 sm:-inset-2 ${roundedClass} border-2 ${pingBorder} animate-ping opacity-75 pointer-events-none`}
      />

      {/* 2. Rhythmic glowing outline with ambient neon aura */}
      <span
        className={`absolute -inset-0.5 sm:-inset-1 ${roundedClass} border-2 ${glowBorder} animate-pulse pointer-events-none`}
      />

      {/* 3. Pulsing circle target beacon placed at the corner */}
      <span
        className={`absolute ${
          variant === "preset" ? "-top-1 -right-1" : "-top-2 -right-2"
        } flex h-4 w-4 pointer-events-none z-40`}
      >
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${beaconColor} opacity-75`}
        />
        <span
          className={`relative inline-flex rounded-full h-4 w-4 ${beaconColor} border-2 border-slate-950 shadow-md flex items-center justify-center`}
        >
          <span className="h-1 w-1 rounded-full bg-slate-950" />
        </span>
      </span>

      {/* 4. Subtle guide indicator pill for action buttons */}
      {variant === "action" && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-40 px-2 py-0.5 rounded-full bg-slate-950/95 border border-cyan-400/80 text-[10px] font-bold text-cyan-300 shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Agent Guidance</span>
        </div>
      )}
    </div>
  );
}
