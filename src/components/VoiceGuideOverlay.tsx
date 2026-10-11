/**
 * @file VoiceGuideOverlay.tsx
 * =============================================================================
 * LIVE VOICE SESSION CONTROLLER & WAVEFORM VISUALIZER
 * =============================================================================
 * This component provides real-time voice interaction controls and acoustic
 * visualization for the Gemini Live API session.
 *
 * Use Cases:
 * 1. Starting and stopping the continuous Gemini Live voice conversation.
 * 2. Visualizing microphone audio activity (volume RMS) with animated bars.
 * 3. Visualizing agent speech output with pulsing acoustic waves.
 * 4. Displaying the Barge-In indicator: reassuring the user that they can
 *    interrupt the agent at any point simply by speaking.
 * 5. Providing an optional fallback text-input field for silent environments.
 * =============================================================================
 */

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  PhoneCall,
  PhoneOff,
  Radio,
  Send,
  Zap,
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
 * VoiceGuideOverlay component for real-time voice controls and audio visualization.
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
  });

  /**
   * Handles submitting typed text into the live session.
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Live Voice State & Audio Waveforms */}
        <div className="flex items-center gap-4">
          {/* Main Voice Hub Button */}
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
            className={`relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg active:scale-95 ${
              isConnected
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30"
            }`}
            title={isConnected ? "End Voice Session" : "Start Live Voice Guide"}
          >
            {isConnected ? (
              <PhoneOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}

            {isAgentSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500" />
              </span>
            )}
          </button>

          {/* Voice State Context */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">
                {isConnected ? "Continuous Live Voice Active" : "Voice Guide on Standby"}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  isAgentSpeaking
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : isConnected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isAgentSpeaking ? "Agent Speaking" : isConnected ? "Listening" : "Ready"}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Barge-in enabled: Speak anytime to interrupt.
                </span>
              ) : (
                `Click mic to start conversational guide in ${currentLanguage.name}.`
              )}
            </p>

            {/* Dynamic visual audio bars */}
            {isConnected && (
              <div className="flex items-center gap-1 mt-2 h-4">
                {[0.2, 0.5, 0.8, 1.0, 0.7, 0.4, 0.9, 0.6].map((scale, i) => {
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
                          : micVolume > 0.1
                          ? "bg-emerald-400"
                          : "bg-slate-700"
                      }`}
                    />
                  );
                })}
                <span className="text-[10px] text-slate-400 font-mono ml-2">
                  {isAgentSpeaking ? "24kHz Audio" : "16kHz Mic"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Text Input fallback */}
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Type in ${currentLanguage.nativeName} or English...`}
            className="w-full md:w-64 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors shrink-0"
            title="Send text prompt"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
