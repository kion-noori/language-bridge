/**
 * @file guide.ts
 * =============================================================================
 * TYPE DEFINITIONS FOR MULTILINGUAL VISUAL VOICE GUIDE AGENT
 * =============================================================================
 * This file centralizes all TypeScript interfaces and enums for the Language Bridge
 * application.
 *
 * Use Cases:
 * 1. Defining Trust Loop step transitions and audit states.
 * 2. Representing live voice and screen capture streaming packets.
 * 3. Modeling real-time bilingual transcripts and risk detection tags.
 * 4. Tracking session lifecycle (connecting, listening, speaking, analyzing).
 * 5. Formatting fee breakdowns and detected UI controls on Coinbase-style screens.
 * =============================================================================
 */

export type TrustLoopStageId =
  | "screen_parsing"
  | "risk_disclosure"
  | "verbal_confirmation"
  | "guided_next_step";

export type SessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "analyzing"
  | "error";

export type ScreenSourceType =
  | "simulator"
  | "screenshare"
  | "upload"
  | "camera";

export interface FeeItem {
  name: string;
  amount: string;
  description: string;
  isTransparent: boolean;
}

export interface ScreenAnalysisResult {
  title: string;
  detectedAsset: string;
  fiatAmount: string;
  cryptoAmount: string;
  fees: FeeItem[];
  riskWarnings: string[];
  confirmationPrompt: string;
  nextStepAdvice: string;
  rawTextResponse?: string;
  trustStage: TrustLoopStageId;
}

export interface TranscriptItem {
  id: string;
  timestamp: string;
  role: "user" | "agent" | "system";
  text: string;
  englishTranslation?: string;
  trustStage?: TrustLoopStageId;
  risksDetected?: string[];
  interrupted?: boolean;
}

export interface LiveClientMessage {
  type: "init" | "audio" | "video" | "text" | "ping";
  languageCode?: string;
  audio?: string; // base64 PCM 16kHz
  video?: string; // base64 JPEG
  text?: string;
}

export interface LiveServerMessagePayload {
  type: "status" | "audio" | "transcript" | "interrupted" | "analysis" | "error";
  status?: SessionStatus;
  audio?: string; // base64 PCM 24kHz
  transcript?: {
    role: "user" | "agent";
    text: string;
    englishTranslation?: string;
    trustStage?: TrustLoopStageId;
    risksDetected?: string[];
  };
  interrupted?: boolean;
  analysis?: ScreenAnalysisResult;
  error?: string;
}

export interface CoinbaseScreenState {
  step: "input" | "preview" | "success";
  asset: "BTC" | "ETH" | "SOL";
  assetPriceUsd: number;
  usdAmount: number;
  paymentMethod: string;
  coinbaseFee: number;
  networkFee: number;
  totalCostUsd: number;
  cryptoQuantity: number;
  isRecurring: boolean;
}
