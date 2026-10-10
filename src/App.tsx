/**
 * @file App.tsx
 * =============================================================================
 * LANGUAGE BRIDGE: MULTILINGUAL VISUAL VOICE GUIDE AGENT
 * =============================================================================
 * Main application shell coordinating the live voice conversation, real-time
 * screen understanding, bilingual transcript feed, and the 4-stage Trust Loop.
 *
 * Core Hackathon Requirements Delivered:
 * 1. Gemini Live API integration for continuous bidirectional voice with barge-in.
 * 2. Real-time screen perception with visible element recognition (Coinbase buy flow).
 * 3. 4-Stage Trust Loop: Screen Explanation -> Risk/Fee Disclosure -> Explicit Verbal Confirmation -> Safe Step.
 * 4. Multilingual support with priority showcase for Persian / Farsi (فارسی).
 * 5. Educational and non-custodial boundaries: Never auto-trades, never holds keys.
 * 6. Centralized logging of all function calls and GenAI invocations.
 * =============================================================================
 */

import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { LanguageSelector } from "./components/LanguageSelector";
import { TrustLoopIndicator } from "./components/TrustLoopIndicator";
import { ScreenCapturePanel } from "./components/ScreenCapturePanel";
import { VoiceGuideOverlay } from "./components/VoiceGuideOverlay";
import { TranscriptFeed } from "./components/TranscriptFeed";
import { SafetyDisclaimerModal } from "./components/SafetyDisclaimerModal";
import { AuditLogModal } from "./components/AuditLogModal";
import { APP_CONFIG, getLanguageConfig, SupportedLanguage } from "./config/appConfig";
import { LiveClient } from "./services/liveClient";
import {
  HighlightedButtonTarget,
  ScreenAnalysisResult,
  SessionStatus,
  TranscriptItem,
  TrustLoopStageId,
} from "./types/guide";
import { logFunctionCall } from "./utils/logger";
import { detectMentionedButton } from "./utils/buttonHighlightDetector";
import { ShieldCheck, Info, Sparkles, HeartHandshake } from "lucide-react";

/**
 * Root Application Component.
 *
 * @returns React.JSX.Element
 */
export default function App(): React.JSX.Element {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    getLanguageConfig(APP_CONFIG.defaultLanguageCode)
  );
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [trustStage, setTrustStage] = useState<TrustLoopStageId>("screen_parsing");
  const [analysis, setAnalysis] = useState<ScreenAnalysisResult | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState<boolean>(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState<boolean>(false);
  const [highlightedButton, setHighlightedButton] = useState<HighlightedButtonTarget | null>(null);
  // STRICT REQUIREMENT: Do not assume sandbox is visible on page load or before user scrolls to it
  const [isSandboxInView, setIsSandboxInView] = useState<boolean>(false);

  const latestFrameRef = useRef<string | null>(null);
  const liveClientRef = useRef<LiveClient | null>(null);
  const buttonHighlightTimerRef = useRef<number | null>(null);
  const isSandboxInViewRef = useRef<boolean>(false);

  // Keep ref synchronized with state for frame provider callback
  useEffect(() => {
    isSandboxInViewRef.current = isSandboxInView;
  }, [isSandboxInView]);

  /**
   * Triggers a temporary visual highlight (pulsing circle & glowing outline)
   * around a specific button on the Coinbase Sandbox for 4-5 seconds, then
   * clears it cleanly.
   *
   * @param target - The button to highlight.
   */
  const triggerButtonHighlight = (target: HighlightedButtonTarget | null) => {
    if (!target) return;
    logFunctionCall("APP", "triggerButtonHighlight", { target });
    setHighlightedButton(target);

    if (buttonHighlightTimerRef.current !== null) {
      window.clearTimeout(buttonHighlightTimerRef.current);
      buttonHighlightTimerRef.current = null;
    }

    buttonHighlightTimerRef.current = window.setTimeout(() => {
      logFunctionCall("APP", "clearButtonHighlightTimeout", { target });
      setHighlightedButton(null);
      buttonHighlightTimerRef.current = null;
    }, APP_CONFIG.highlight.durationMs);
  };

  logFunctionCall("APP", "render", {
    status,
    language: currentLanguage.code,
    trustStage,
    highlightedButton,
    isSandboxInView,
  });

  /**
   * Initializes or updates the LiveClient when currentLanguage changes.
   */
  useEffect(() => {
    const client = new LiveClient(currentLanguage.code, {
      onStatusChange: (newStatus) => setStatus(newStatus),
      onTranscript: (item) => {
        setTranscript((prev) => [...prev, item]);
        // When the agent mentions a button in spoken output or transcript, highlight it
        if (item.role === "agent") {
          const detected = detectMentionedButton(item.text, item.englishTranslation);
          if (detected) {
            triggerButtonHighlight(detected);
          }
        }
      },
      onTrustStageChange: (stage) => setTrustStage(stage),
      onAnalysisResult: (result) => {
        setAnalysis(result);
        // Detect mentioned button from guidance fields
        const combined = `${result.nextStepAdvice || ""} ${result.spokenScript || ""} ${result.confirmationPrompt || ""}`;
        const detected = detectMentionedButton(combined);
        if (detected) {
          triggerButtonHighlight(detected);
        }
      },
      onMicVolume: (vol) => setMicVolume(vol),
      onAgentSpeakingChange: (speaking) => setIsAgentSpeaking(speaking),
    });

    // Provide screen frame ONLY when the sandbox is actively in the viewport!
    client.registerFrameProvider(() => {
      if (!isSandboxInViewRef.current) return null;
      return latestFrameRef.current;
    });
    liveClientRef.current = client;

    return () => {
      client.disconnect();
      if (buttonHighlightTimerRef.current !== null) {
        window.clearTimeout(buttonHighlightTimerRef.current);
      }
    };
  }, []);

  /**
   * Handles user switching language.
   *
   * @param lang - Target language.
   */
  const handleSelectLanguage = (lang: SupportedLanguage) => {
    logFunctionCall("APP", "handleSelectLanguage", { code: lang.code });
    setCurrentLanguage(lang);
    if (liveClientRef.current) {
      liveClientRef.current.setLanguage(lang.code);
    }
  };

  /**
   * Starts continuous voice session.
   */
  const handleStartSession = async () => {
    logFunctionCall("APP", "handleStartSession", {});
    if (liveClientRef.current) {
      await liveClientRef.current.connect();
    }
  };

  /**
   * Ends continuous voice session.
   */
  const handleEndSession = () => {
    logFunctionCall("APP", "handleEndSession", {});
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
    }
  };

  /**
   * Sends user goal or typed message into the session.
   *
   * @param text - User message string.
   */
  const handleSendTextMessage = (text: string) => {
    logFunctionCall("APP", "handleSendTextMessage", { text });
    // Add user turn to transcript immediately
    setTranscript((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        timestamp: new Date().toLocaleTimeString(),
        role: "user",
        text,
      },
    ]);

    if (liveClientRef.current) {
      liveClientRef.current.sendTextMessage(text);
      // If we have an active screen frame, also trigger direct analysis
      if (latestFrameRef.current) {
        liveClientRef.current.requestDirectScreenAnalysis(
          latestFrameRef.current,
          text
        );
      }
    }
  };

  /**
   * Stores the latest available screen frame from simulator/screen share.
   *
   * @param dataUrl - Base64 JPEG data URL.
   */
  const handleFrameAvailable = (dataUrl: string) => {
    latestFrameRef.current = dataUrl;
  };

  /**
   * Automatically handles viewport intersection changes for the Coinbase Sandbox.
   * When scrolled into view, automatically feeds frames to the guide.
   * When out of view, stops frame feed and ensures agent does not see buy screen.
   *
   * @param inView - Boolean indicating whether Coinbase Sandbox is in viewport.
   */
  const handleSandboxViewportChange = (inView: boolean) => {
    logFunctionCall("APP", "handleSandboxViewportChange", { inView });
    setIsSandboxInView(inView);
    if (!inView) {
      latestFrameRef.current = null;
    } else {
      // If connected, immediately forward current frame to Gemini Live
      setTimeout(() => {
        if (liveClientRef.current && latestFrameRef.current) {
          liveClientRef.current.sendCurrentScreenFrame();
        }
      }, 50);
    }
  };

  /**
   * Triggers explicit multimodal inspection of the current screen.
   *
   * @param dataUrl - Base64 JPEG.
   */
  const handleManualInspectScreen = async (dataUrl: string) => {
    logFunctionCall("APP", "handleManualInspectScreen", {});
    latestFrameRef.current = dataUrl;
    if (liveClientRef.current) {
      await liveClientRef.current.requestDirectScreenAnalysis(
        dataUrl,
        currentLanguage.sampleGoal
      );
    }
  };

  /**
   * Handles user confirming verbally or by clicking the confirmation button.
   */
  const handleConfirmStep = () => {
    logFunctionCall("APP", "handleConfirmStep", { currentTrustStage: trustStage });
    // Progress to stage 4: Guided Next Step
    setTrustStage("guided_next_step");

    const confirmationText = currentLanguage.confirmationPhrases[0] || "Yes";
    const guidanceText =
      analysis?.nextStepAdvice ||
      `عالی است. حالا لطفاً روی دکمه آبی رنگ کلیک کنید. من در هر مرحله در کنار شما هستم.`;
    const englishTranslation =
      "Excellent. Now please click the blue button. I am right here with you.";

    // Trigger visual highlight on the guided button
    const detected = detectMentionedButton(guidanceText, englishTranslation);
    if (detected) {
      triggerButtonHighlight(detected);
    } else {
      triggerButtonHighlight("preview_buy");
    }

    setTranscript((prev) => [
      ...prev,
      {
        id: `${Date.now()}-confirm`,
        timestamp: new Date().toLocaleTimeString(),
        role: "user",
        text: `${confirmationText} (Verbal confirmation granted)`,
        trustStage: "verbal_confirmation",
      },
      {
        id: `${Date.now()}-guidance`,
        timestamp: new Date().toLocaleTimeString(),
        role: "agent",
        text: guidanceText,
        englishTranslation,
        trustStage: "guided_next_step",
      },
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <Header
        status={status}
        currentLanguage={currentLanguage}
        onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
        onOpenAuditLog={() => setIsAuditLogOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* HERO LIVE VOICE GUIDE CONTROLLER (Primary Prominent Action) */}
        <VoiceGuideOverlay
          status={status}
          isAgentSpeaking={isAgentSpeaking}
          micVolume={micVolume}
          currentLanguage={currentLanguage}
          onStartSession={handleStartSession}
          onEndSession={handleEndSession}
          onSendTextMessage={handleSendTextMessage}
        />

        {/* Hackathon Mission & Non-Custodial Safety Summary */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                Empowering Immigrants & Non-Native Speakers
                <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  Trust-First Agentic UX
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                The agent sees your screen, speaks your language, surfaces hidden fees, and requires verbal confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{APP_CONFIG.safety.shortDisclaimer}</span>
            </span>
          </div>
        </div>

        {/* Language Selection Bar (Prioritizing Farsi) */}
        <LanguageSelector
          currentLanguage={currentLanguage}
          onSelectLanguage={handleSelectLanguage}
          onSendGoalToAgent={handleSendTextMessage}
        />

        {/* 4-Stage Trust Loop Visualization */}
        <TrustLoopIndicator
          currentStage={trustStage}
          analysis={analysis}
          onConfirmStep={handleConfirmStep}
        />

        {/* Primary Workspace: Multimodal Screen (Left) + Bilingual Transcript (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Multimodal Screen Ingestion & Coinbase Simulator */}
          <div className="lg:col-span-7 space-y-4">
            <ScreenCapturePanel
              onFrameAvailable={handleFrameAvailable}
              onRequestManualAnalysis={handleManualInspectScreen}
              isAnalyzing={status === "analyzing"}
              highlightedButton={highlightedButton}
              onSandboxViewportChange={handleSandboxViewportChange}
            />
          </div>

          {/* Right Column: Live Bilingual Transcript Feed */}
          <div className="lg:col-span-5 space-y-4">
            <TranscriptFeed
              items={transcript}
              onClearTranscript={() => setTranscript([])}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          Language Bridge • Built for Google DeepMind × Forever 22 Hackathon • Powered by Gemini Live API & Google GenAI SDK
        </p>
      </footer>

      {/* Modals */}
      <SafetyDisclaimerModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />
    </div>
  );
}
