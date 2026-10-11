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
  ScreenAnalysisResult,
  SessionStatus,
  TranscriptItem,
  TrustLoopStageId,
} from "./types/guide";
import { logFunctionCall } from "./utils/logger";
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

  const latestFrameRef = useRef<string | null>(null);
  const liveClientRef = useRef<LiveClient | null>(null);

  logFunctionCall("APP", "render", {
    status,
    language: currentLanguage.code,
    trustStage,
  });

  /**
   * Initializes or updates the LiveClient when currentLanguage changes.
   */
  useEffect(() => {
    const client = new LiveClient(currentLanguage.code, {
      onStatusChange: (newStatus) => setStatus(newStatus),
      onTranscript: (item) => {
        setTranscript((prev) => [...prev, item]);
      },
      onTrustStageChange: (stage) => setTrustStage(stage),
      onAnalysisResult: (result) => setAnalysis(result),
      onMicVolume: (vol) => setMicVolume(vol),
      onAgentSpeakingChange: (speaking) => setIsAgentSpeaking(speaking),
    });

    // Provide the latest screen frame for video streaming
    client.registerFrameProvider(() => latestFrameRef.current);
    liveClientRef.current = client;

    return () => {
      client.disconnect();
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
        text:
          analysis?.nextStepAdvice ||
          `عالی است. حالا لطفاً روی دکمه آبی رنگ کلیک کنید. من در هر مرحله در کنار شما هستم.`,
        englishTranslation: "Excellent. Now please click the blue button. I am right here with you.",
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Hackathon Mission & Non-Custodial Banner */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Empowering Immigrants & Non-Native Speakers
                <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  Trust-First Agentic UX
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The agent sees your screen, speaks your language, surfaces hidden fees, and waits for verbal consent.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
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

        {/* Primary Workspace: Multimodal Screen (Left) + Voice Guide & Transcript (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Multimodal Screen Ingestion & Coinbase Simulator */}
          <div className="lg:col-span-7 space-y-4">
            <ScreenCapturePanel
              onFrameAvailable={handleFrameAvailable}
              onRequestManualAnalysis={handleManualInspectScreen}
              isAnalyzing={status === "analyzing"}
            />
          </div>

          {/* Right Column: Live Voice Controller & Bilingual Transcript Feed */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Voice Hub & Barge-in controls */}
            <VoiceGuideOverlay
              status={status}
              isAgentSpeaking={isAgentSpeaking}
              micVolume={micVolume}
              currentLanguage={currentLanguage}
              onStartSession={handleStartSession}
              onEndSession={handleEndSession}
              onSendTextMessage={handleSendTextMessage}
            />

            {/* Live Bilingual Transcript */}
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
