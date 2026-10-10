/**
 * @file liveClient.ts
 * =============================================================================
 * WEBSOCKET CLIENT & MULTIMODAL STREAMING CONTROLLER
 * =============================================================================
 * This client manages the bi-directional communication between the browser UI
 * and the backend Gemini Live server session (`/live`).
 *
 * Use Cases:
 * 1. Establishing and maintaining the WebSocket connection to the server.
 * 2. Transmitting microphone PCM chunks (`audio`) and screen video frames (`video`).
 * 3. Handling incoming 24kHz audio streams and piping them to `AudioPlayer`.
 * 4. Handling `interrupted` events for instant barge-in response.
 * 5. Parsing real-time transcript events (both user speech and agent voice).
 * 6. Managing fallback to REST `/api/guidance` when WebSocket is disconnected or in test environments.
 * =============================================================================
 */

import { APP_CONFIG, getLanguageConfig, SupportedLanguage } from "../config/appConfig";
import { AudioPlayer } from "../audio/audioPlayer";
import { AudioRecorder } from "../audio/audioRecorder";
import {
  LiveClientMessage,
  LiveServerMessagePayload,
  ScreenAnalysisResult,
  SessionStatus,
  TranscriptItem,
  TrustLoopStageId,
} from "../types/guide";
import { logError, logFunctionCall, logInfo } from "../utils/logger";

export interface LiveClientCallbacks {
  onStatusChange: (status: SessionStatus) => void;
  onTranscript: (item: TranscriptItem) => void;
  onTrustStageChange: (stage: TrustLoopStageId) => void;
  onAnalysisResult?: (analysis: ScreenAnalysisResult) => void;
  onMicVolume?: (volume: number) => void;
  onAgentSpeakingChange?: (isSpeaking: boolean) => void;
}

export class LiveClient {
  private socket: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private audioPlayer: AudioPlayer | null = null;
  private currentLanguage: SupportedLanguage;
  private callbacks: LiveClientCallbacks;
  private status: SessionStatus = "idle";
  private currentTrustStage: TrustLoopStageId = "screen_parsing";
  private videoIntervalId: number | null = null;
  private getFrameCallback: (() => string | null) | null = null;
  private hasScreenBeenFed: boolean = false;

  /**
   * Initializes the LiveClient with target language and event listeners.
   *
   * @param languageCode - Target language ISO code.
   * @param callbacks - Event callbacks.
   */
  constructor(
    languageCode: string,
    callbacks: LiveClientCallbacks,
    initialScreenFed: boolean = false
  ) {
    this.currentLanguage = getLanguageConfig(languageCode);
    this.callbacks = callbacks;
    this.hasScreenBeenFed = initialScreenFed;

    this.audioPlayer = new AudioPlayer((isSpeaking) => {
      if (this.callbacks.onAgentSpeakingChange) {
        this.callbacks.onAgentSpeakingChange(isSpeaking);
      }
      if (isSpeaking && this.status !== "speaking") {
        this.updateStatus("speaking");
      } else if (!isSpeaking && this.status === "speaking") {
        this.updateStatus("listening");
      }
    });

    logFunctionCall("LIVE_CLIENT", "constructor", { languageCode, initialScreenFed });
  }

  /**
   * Updates current operational status and notifies UI.
   */
  private updateStatus(newStatus: SessionStatus): void {
    this.status = newStatus;
    this.callbacks.onStatusChange(newStatus);
  }

  /**
   * Switches the active language for the session.
   *
   * @param languageCode - New language code.
   */
  public setLanguage(languageCode: string): void {
    logFunctionCall("LIVE_CLIENT", "setLanguage", { languageCode });
    this.currentLanguage = getLanguageConfig(languageCode);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "init",
          languageCode: this.currentLanguage.code,
          hasScreenBeenFed: this.hasScreenBeenFed,
        })
      );
    }
  }

  /**
   * Registers a provider function that extracts the current screen frame as base64 JPEG.
   *
   * @param provider - Function returning base64 JPEG string or null.
   */
  public registerFrameProvider(provider: () => string | null): void {
    this.getFrameCallback = provider;
  }

  /**
   * Sets whether the screen or built-in sandbox is currently visible.
   *
   * @param isFed - Whether screen is visible.
   * @param frame - Optional base64 frame data.
   */
  public setScreenFedState(isFed: boolean, frame?: string): void {
    logFunctionCall("LIVE_CLIENT", "setScreenFedState", { isFed });
    this.hasScreenBeenFed = isFed;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "screen_fed",
          languageCode: this.currentLanguage.code,
          hasScreenBeenFed: isFed,
          ...(frame ? { video: frame } : {}),
        })
      );
      if (isFed) {
        this.sendCurrentScreenFrame();
      }
    }
  }

  /**
   * Explicitly marks that the user has fed/shared their screen to the agent.
   */
  public markScreenFed(): void {
    logFunctionCall("LIVE_CLIENT", "markScreenFed", {});
    this.setScreenFedState(true);
  }

  /**
   * Returns whether the screen has been detected / fed.
   */
  public getIsScreenFed(): boolean {
    return this.hasScreenBeenFed;
  }

  /**
   * Connects to the Gemini Live session via WebSocket and initiates microphone streaming.
   *
   * @returns Promise resolving to boolean indicating success.
   */
  public async connect(): Promise<boolean> {
    logFunctionCall("LIVE_CLIENT", "connect", {
      language: this.currentLanguage.code,
      hasScreenBeenFed: this.hasScreenBeenFed,
    });
    this.updateStatus("connecting");

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/live`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        logFunctionCall("LIVE_CLIENT", "websocket.onopen", { wsUrl });
        this.updateStatus("connected");

        // Send initialization message with current screen visibility state
        const initMsg: LiveClientMessage = {
          type: "init",
          languageCode: this.currentLanguage.code,
          hasScreenBeenFed: this.hasScreenBeenFed,
        };
        this.socket?.send(JSON.stringify(initMsg));

        // Start audio capture
        this.startMicrophoneCapture();

        // Start periodic screen frame push (1 FPS)
        this.startScreenStreaming();
      };

      this.socket.onmessage = (event) => {
        try {
          const payload: LiveServerMessagePayload = JSON.parse(event.data);
          this.handleServerMessage(payload);
        } catch (err) {
          logError("LIVE_CLIENT", "socket.onmessage.parse", err);
        }
      };

      this.socket.onerror = (err) => {
        logError("LIVE_CLIENT", "websocket.onerror", err);
        this.updateStatus("error");
      };

      this.socket.onclose = () => {
        logFunctionCall("LIVE_CLIENT", "websocket.onclose", {});
        if (this.status !== "idle") {
          this.updateStatus("idle");
        }
        this.stopScreenStreaming();
      };

      return true;
    } catch (error) {
      logError("LIVE_CLIENT", "connect", error);
      this.updateStatus("error");
      return false;
    }
  }

  /**
   * Starts capturing user microphone and pushing audio packets over WebSocket.
   */
  private async startMicrophoneCapture(): Promise<void> {
    if (!this.audioRecorder) {
      this.audioRecorder = new AudioRecorder(
        (base64Chunk) => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
              JSON.stringify({
                type: "audio",
                audio: base64Chunk,
              })
            );
          }
        },
        (volume) => {
          if (this.callbacks.onMicVolume) {
            this.callbacks.onMicVolume(volume);
          }
        },
        // Immediate client-side Barge-In trigger when user starts speaking
        () => {
          if (this.audioPlayer?.isCurrentlyPlaying()) {
            logFunctionCall("LIVE_CLIENT", "localBargeInTriggered", {});
            this.audioPlayer.stopAndFlush();
            this.updateStatus("listening");
            // Inform server to interrupt the Live session immediately
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(
                JSON.stringify({
                  type: "barge_in",
                })
              );
            }
          }
        }
      );
    }

    const started = await this.audioRecorder.start();
    if (started) {
      this.updateStatus("listening");
    }
  }

  /**
   * Starts 1 FPS video frame transmission from the active screen source.
   */
  private startScreenStreaming(): void {
    this.stopScreenStreaming();
    const intervalMs = 1000 / APP_CONFIG.screenStreaming.framesPerSecond;

    this.videoIntervalId = window.setInterval(() => {
      this.sendCurrentScreenFrame();
    }, intervalMs);
  }

  /**
   * Sends the current screen frame immediately to Gemini.
   */
  public sendCurrentScreenFrame(): void {
    if (!this.hasScreenBeenFed || !this.getFrameCallback) return;
    const frameBase64 = this.getFrameCallback();
    if (!frameBase64) return;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "video",
          video: frameBase64,
        })
      );
    }
  }

  /**
   * Stops video frame transmission.
   */
  private stopScreenStreaming(): void {
    if (this.videoIntervalId !== null) {
      clearInterval(this.videoIntervalId);
      this.videoIntervalId = null;
    }
  }

  /**
   * Processes incoming server messages (audio chunks, barge-in, transcript, trust loop).
   *
   * @param payload - Incoming message payload.
   */
  private handleServerMessage(payload: LiveServerMessagePayload): void {
    // 1. Audio output
    if (payload.audio && this.audioPlayer) {
      this.audioPlayer.playChunk(payload.audio);
    }

    // 2. Barge-in / interruption
    if (payload.interrupted) {
      logFunctionCall("LIVE_CLIENT", "bargeInDetected", {});
      this.audioPlayer?.stopAndFlush();
      this.updateStatus("listening");
    }

    // 3. Transcript item
    if (payload.transcript) {
      const item: TranscriptItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        role: payload.transcript.role,
        text: payload.transcript.text,
        englishTranslation: payload.transcript.englishTranslation,
        trustStage: payload.transcript.trustStage || this.currentTrustStage,
        risksDetected: payload.transcript.risksDetected,
      };
      this.callbacks.onTranscript(item);

      if (payload.transcript.trustStage) {
        this.currentTrustStage = payload.transcript.trustStage;
        this.callbacks.onTrustStageChange(payload.transcript.trustStage);
      }
    }

    // 4. Structured screen analysis result
    if (payload.analysis) {
      if (this.callbacks.onAnalysisResult) {
        this.callbacks.onAnalysisResult(payload.analysis);
      }
      if (payload.analysis.trustStage) {
        this.currentTrustStage = payload.analysis.trustStage;
        this.callbacks.onTrustStageChange(payload.analysis.trustStage);
      }
    }
  }

  /**
   * Disconnects the WebSocket, stops microphone recording, and cleans up resources.
   */
  public disconnect(): void {
    logFunctionCall("LIVE_CLIENT", "disconnect", {});
    this.stopScreenStreaming();

    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = null;
    }

    if (this.audioPlayer) {
      this.audioPlayer.stopAndFlush();
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.updateStatus("idle");
  }

  /**
   * Sends a text prompt (e.g. user typed command or preset goal) into the active session.
   *
   * @param text - Text string.
   */
  public sendTextMessage(text: string): void {
    logFunctionCall("LIVE_CLIENT", "sendTextMessage", { text });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "text",
          text,
        })
      );
    }
  }

  /**
   * Executes a direct multimodal screen analysis query via the REST endpoint `/api/guidance`
   * when users click "Analyze Screen Now" or as a resilient fallback.
   *
   * @param imageBase64 - Screen image base64.
   * @param userGoal - User spoken or typed goal.
   * @returns ScreenAnalysisResult or null.
   */
  public async requestDirectScreenAnalysis(
    imageBase64: string,
    userGoal?: string
  ): Promise<ScreenAnalysisResult | null> {
    logFunctionCall("LIVE_CLIENT", "requestDirectScreenAnalysis", {
      hasImage: !!imageBase64,
      userGoal,
    });
    this.updateStatus("analyzing");

    try {
      const response = await fetch("/api/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          languageCode: this.currentLanguage.code,
          goal: userGoal || this.currentLanguage.sampleGoal,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const analysis: ScreenAnalysisResult = data.analysis;

      if (data.audio && this.audioPlayer) {
        this.audioPlayer.playChunk(data.audio);
      }

      if (this.callbacks.onAnalysisResult) {
        this.callbacks.onAnalysisResult(analysis);
      }

      if (analysis.trustStage) {
        this.currentTrustStage = analysis.trustStage;
        this.callbacks.onTrustStageChange(analysis.trustStage);
      }

      // Add to transcript
      if (analysis.rawTextResponse) {
        this.callbacks.onTranscript({
          id: `${Date.now()}-resp`,
          timestamp: new Date().toLocaleTimeString(),
          role: "agent",
          text: analysis.rawTextResponse,
          englishTranslation: analysis.confirmationPrompt,
          trustStage: analysis.trustStage,
          risksDetected: analysis.riskWarnings,
        });
      }

      this.updateStatus("listening");
      return analysis;
    } catch (err) {
      logError("LIVE_CLIENT", "requestDirectScreenAnalysis", err);
      this.updateStatus("listening");
      return null;
    }
  }

  /**
   * Returns current session status.
   */
  public getStatus(): SessionStatus {
    return this.status;
  }
}
