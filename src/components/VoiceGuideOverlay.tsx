/**
 * @file VoiceGuideOverlay.tsx
 * =============================================================================
 * HERO LIVE VOICE CONTROLLER & ACOUSTIC BARGE-IN VISUALIZER
 * =============================================================================
 * This component serves as the primary call-to-action controller for Language Bridge.
 * Positioned prominently at the top of the interface under the header, it ensures
 * starting the Gemini Live voice session is the most immediately visible action
 * without requiring any scrolling.
 *
 * Use Cases:
 * 1. Prominent one-click start/stop trigger for the continuous Gemini Live session.
 * 2. Visualizing microphone capture volume (16kHz PCM) and model speech (24kHz PCM).
 * 3. Clearly signaling Barge-In capability so users know they can interrupt at will.
 * 4. Displaying current active target language (e.g. فارسی / Persian).
 * 5. Providing typed text fallback for silent testing environments.
 * =============================================================================
 */

import React, { useState } from "react";
import {
  Mic,
  PhoneOff,
  Zap,
  Send,
  Volume2,
  Sparkles,
} from "lucide-react";
import { SessionStatus } from "../types/guide";
import { SupportedLanguage } from "../config/appConfig";
import { logFunctionCall } from "../utils/logger";

interface VoiceGuideOverlayProps {
  status: SessionStatus;
  isAgentSpeaking: boolean;
  micVolume: number;
  currentLanguage: SupportedLanguage;
  onStartSession: () => void;
  onEndSession: () => void;
  onSendTextMessage: (text: string) => void;
}

/**
 * VoiceGuideOverlay component rendering the hero-level voice guide controller.
 *
 * @param props - VoiceGuideOverlayProps
 * @returns React.JSX.Element
 */
export function VoiceGuideOverlay({
  status,
  isAgentSpeaking,
  micVolume,
  currentLanguage,
  onStartSession,
  onEndSession,
  onSendTextMessage,
}: VoiceGuideOverlayProps): React.JSX.Element {
  const [textInput, setTextInput] = useState("");
  const isConnected = status !== "idle" && status !== "error";

  logFunctionCall("VOICE_GUIDE_OVERLAY", "render", {
    status,
    isAgentSpeaking,
    micVolume,
    language: currentLanguage.code,
  });

  /**
   * Handles submitting typed text into the live session.
   *
   * @param e - Form submit event.
   */
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    logFunctionCall("VOICE_GUIDE_OVERLAY", "submitTextInput", {
      text: textInput,
    });
    onSendTextMessage(textInput.trim());
    setTextInput("");
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border-2 border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-xl shadow-cyan-950/30">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Prominent Hero CTA Button & Live Audio Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Main Hero Voice Button */}
          <button
            onClick={() => {
              if (isConnected) {
                logFunctionCall("VOICE_GUIDE_OVERLAY", "clickEndSession", {});
                onEndSession();
              } else {
                logFunctionCall("VOICE_GUIDE_OVERLAY", "clickStartSession", {});
                onStartSession();
              }
            }}
            className={`group relative flex items-center gap-3.5 px-6 py-3.5 rounded-2xl transition-all shadow-lg active:scale-98 cursor-pointer ${
              isConnected
                ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/40"
                : "bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:via-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/35 ring-2 ring-cyan-400/50 hover:shadow-cyan-500/50"
            }`}
            title={isConnected ? "End Voice Session" : "Start Live Voice Guide"}
          >
            {/* Animated Mic/Phone Icon container */}
            <div
              className={`p-2.5 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                isConnected ? "bg-white/20" : "bg-white/20"
              }`}
            >
              {isConnected ? (
                <PhoneOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white animate-pulse" />
              )}
            </div>

            {/* Label and Language subtext */}
            <div className="text-left">
              <span className="font-extrabold text-base tracking-tight block">
                {isConnected ? "End Voice Session" : "Start Live Voice Guide"}
              </span>
              <span className="text-xs font-medium opacity-90 flex items-center gap-1.5">
                {isConnected ? (
                  <span className="text-rose-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Live streaming audio
                  </span>
                ) : (
                  <span className="text-cyan-100 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Gemini Live • {currentLanguage.nativeName} ({currentLanguage.name})
                  </span>
                )}
              </span>
            </div>

            {/* Speaking pulse ring */}
            {isAgentSpeaking && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-400" />
              </span>
            )}
          </button>

          {/* Voice status info & animated audio visualizer */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">
                {isConnected ? "Live Voice Session Active" : "Voice Guide on Standby"}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isAgentSpeaking
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 animate-pulse"
                    : isConnected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                    : "bg-slate-800 text-slate-400 border border-slate-700/60"
                }`}
              >
                {isAgentSpeaking ? "Agent Speaking" : isConnected ? "Listening" : "Ready"}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {isConnected ? (
                <span className="flex items-center gap-1 text-cyan-300 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Barge-in enabled: speak at any moment to interrupt.
                </span>
              ) : (
                `Click the button above to speak directly with the agent in ${currentLanguage.nativeName}.`
              )}
            </p>

            {/* Dynamic visual audio bars */}
            {isConnected && (
              <div className="flex items-center gap-1.5 mt-2 h-4">
                {[0.2, 0.5, 0.8, 1.0, 0.7, 0.4, 0.9, 0.6, 0.3, 0.75].map((scale, i) => {
                  const height = isAgentSpeaking
                    ? Math.max(4, scale * 16)
                    : Math.max(4, micVolume * scale * 24);
                  return (
                    <span
                      key={i}
                      style={{ height: `${height}px` }}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isAgentSpeaking
                          ? "bg-cyan-400"
                          : micVolume > 0.08
                          ? "bg-emerald-400"
                          : "bg-slate-700"
                      }`}
                    />
                  );
                })}
                <span className="text-[10px] text-slate-400 font-mono ml-2">
                  {isAgentSpeaking ? "24kHz PCM" : "16kHz Mic"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick text prompt / goal input */}
        <form
          onSubmit={handleTextSubmit}
          className="flex items-center gap-2 w-full lg:w-auto shrink-0"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Or type in ${currentLanguage.nativeName} or English...`}
            className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white transition-colors shrink-0 shadow-sm"
            title="Send text prompt"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
