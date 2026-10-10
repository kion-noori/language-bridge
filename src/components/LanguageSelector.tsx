/**
 * @file LanguageSelector.tsx
 * =============================================================================
 * MULTILINGUAL SELECTION & NATIVE SCRIPT CONTROLLER
 * =============================================================================
 * This component enables users to choose their preferred spoken language for
 * the visual voice guide.
 *
 * Use Cases:
 * 1. Highlights Farsi / Persian (فارسی) as a prioritized hackathon showcase,
 *    accommodating Right-to-Left (RTL) reading direction and Persian script.
 * 2. Provides immediate access to Spanish, Arabic, Turkish, Hindi, Vietnamese,
 *    Mandarin, and English.
 * 3. Shows sample user goals in each native tongue (e.g. "می‌خواهم با خیال راحت
 *    یک مقدار کم بیت‌کوین بخرم") with a one-click "Prompt Agent" shortcut.
 * 4. Logs all language selection interactions at INFO level.
 * =============================================================================
 */

import React from "react";
import { Globe, Sparkles, SendHorizontal } from "lucide-react";
import { APP_CONFIG, SupportedLanguage } from "../config/appConfig";
import { logFunctionCall } from "../utils/logger";

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onSelectLanguage: (language: SupportedLanguage) => void;
  onSendGoalToAgent: (goalText: string) => void;
}

/**
 * LanguageSelector component with native script badges and goal suggestions.
 *
 * @param props - LanguageSelectorProps
 * @returns React.JSX.Element
 */
export function LanguageSelector({
  currentLanguage,
  onSelectLanguage,
  onSendGoalToAgent,
}: LanguageSelectorProps): React.JSX.Element {
  logFunctionCall("LANGUAGE_SELECTOR", "render", {
    selectedCode: currentLanguage.code,
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              Select Your Preferred Language
              <span className="text-[11px] font-normal text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Live Speech & Voice
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              The agent will explain the screen and guide you entirely in this language.
            </p>
          </div>
        </div>

        {/* Priority Highlight Badge */}
        {currentLanguage.code === "fa" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Showcase: Persian (فارسی) Priority</span>
          </div>
        )}
      </div>

      {/* Language pill grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        {APP_CONFIG.languages.map((lang) => {
          const isSelected = lang.code === currentLanguage.code;
          return (
            <button
              key={lang.code}
              onClick={() => {
                logFunctionCall("LANGUAGE_SELECTOR", "selectLanguage", {
                  code: lang.code,
                  name: lang.name,
                });
                onSelectLanguage(lang);
              }}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-cyan-500/15 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/40"
                  : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold">{lang.name}</span>
                {lang.priority && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="Priority Showcase" />
                )}
              </div>
              <span
                className={`text-sm mt-1 font-medium ${
                  lang.isRtl ? "font-serif text-right w-full" : ""
                } ${isSelected ? "text-cyan-300 font-bold" : "text-slate-400"}`}
              >
                {lang.nativeName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sample User Voice Goal for the selected language */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs text-slate-400 shrink-0">Sample Voice Goal:</span>
          <span
            className={`text-xs font-medium text-slate-200 truncate ${
              currentLanguage.isRtl ? "text-right font-serif" : ""
            }`}
          >
            "{currentLanguage.sampleGoal}"
          </span>
        </div>

        <button
          onClick={() => {
            logFunctionCall("LANGUAGE_SELECTOR", "sendSampleGoal", {
              goal: currentLanguage.sampleGoal,
            });
            onSendGoalToAgent(currentLanguage.sampleGoal);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shrink-0 shadow-sm"
        >
          <SendHorizontal className="w-3.5 h-3.5" />
          <span>Speak / Send This Goal</span>
        </button>
      </div>
    </div>
  );
}
