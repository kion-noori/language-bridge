/**
 * @file TranscriptFeed.tsx
 * =============================================================================
 * BILINGUAL TRANSCRIPT & REAL-TIME AUDIT FEED
 * =============================================================================
 * This component displays the continuous speech conversation between the user
 * and the Language Bridge agent.
 *
 * Use Cases:
 * 1. Displays transcription of incoming user speech and model voice output.
 * 2. Visualizes the native script (e.g., Persian/Farsi with RTL styling) alongside
 *    English translation hints for evaluation and transparency.
 * 3. Annotates messages with Trust Loop stage tags and detected risk badges.
 * 4. Highlights barge-in interruption markers when the user interrupted the agent.
 * 5. Provides a clear transcript action.
 * =============================================================================
 */

import React, { useRef, useEffect, useState } from "react";
import {
  MessageSquare,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Languages,
} from "lucide-react";
import { TranscriptItem } from "../types/guide";
import { logFunctionCall } from "../utils/logger";

interface TranscriptFeedProps {
  items: TranscriptItem[];
  onClearTranscript: () => void;
}

/**
 * TranscriptFeed component rendering live conversation turns with bilingual support.
 *
 * @param props - TranscriptFeedProps
 * @returns React.JSX.Element
 */
export function TranscriptFeed({
  items,
  onClearTranscript,
}: TranscriptFeedProps): React.JSX.Element {
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  logFunctionCall("TRANSCRIPT_FEED", "render", { itemCount: items.length });

  // Scroll only the internal transcript box without affecting page or window scroll
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [items]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col h-[560px]">
      {/* Header with Bilingual Toggle & Clear */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            Live Speech Transcript
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            ({items.length} turns)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              logFunctionCall("TRANSCRIPT_FEED", "toggleTranslation", {
                current: showEnglishTranslation,
              });
              setShowEnglishTranslation(!showEnglishTranslation);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              showEnglishTranslation
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Dual Translation</span>
          </button>

          <button
            onClick={() => {
              logFunctionCall("TRANSCRIPT_FEED", "clearTranscript", {});
              onClearTranscript();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Clear transcript"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message turn list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Bot className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
            <p className="text-xs">No conversation activity yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Start the voice session or click "Speak / Send Goal" to begin.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isAgent = item.role === "agent";
            const isUser = item.role === "user";

            return (
              <div
                key={item.id}
                className={`flex gap-3 text-xs ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isAgent
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Content Bubble */}
                <div
                  className={`max-w-[82%] rounded-xl p-3 border space-y-1.5 ${
                    isAgent
                      ? "bg-slate-950/80 border-slate-800 text-slate-200"
                      : "bg-emerald-950/30 border-emerald-800/40 text-emerald-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {isAgent ? "Language Bridge Agent" : "You (User Speech)"}
                    </span>
                    <span>{item.timestamp}</span>
                  </div>

                  {/* Primary text in user's language */}
                  <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap">
                    {item.text}
                  </p>

                  {/* English translation preview */}
                  {showEnglishTranslation && item.englishTranslation && (
                    <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                      <span className="text-cyan-400 font-semibold not-italic">EN: </span>
                      {item.englishTranslation}
                    </div>
                  )}

                  {/* Risk warning tags if attached */}
                  {item.risksDetected && item.risksDetected.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.risksDetected.map((risk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{risk}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Interruption notification badge */}
                  {item.interrupted && (
                    <span className="inline-block text-[10px] text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/40">
                      ⚡ Interrupted by user speech
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
