/**
 * @file server.ts
 * =============================================================================
 * FULL-STACK EXPRESS & WEBSOCKET SERVER FOR LANGUAGE BRIDGE
 * =============================================================================
 * This server orchestrates all backend operations for the Multilingual Visual
 * Voice Guide prototype:
 *
 * Use Cases:
 * 1. Hosts the Express HTTP server and mounts the Vite development middleware
 *    on port 3000.
 * 2. Manages WebSocket connections at path `/live` and establishes real-time
 *    bidirectional voice & video streaming sessions with Gemini Live API
 *    (`gemini-3.8-live`).
 * 3. Bridges client microphone PCM streams (`audio/pcm;rate=16000`) and video
 *    frames (`image/jpeg`) to `session.sendRealtimeInput`.
 * 4. Relays Live audio chunks (`audio/pcm;rate=24000`), interruption signals,
 *    and audio transcriptions back to the client WebSocket.
 * 5. Provides `/api/guidance`: A multimodal screen analysis endpoint using
 *    `gemini-3.8-flash` and `gemini-3.8-flash-lite-tts` for high-precision
 *    trust loop analysis and voice synthesis.
 * 6. Logs all GenAI calls and function invocations while stripping large binary
 *    payloads.
 * =============================================================================
 */

import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import {
  APP_CONFIG,
  buildSystemInstruction,
  getLanguageConfig,
  getAgentGreeting,
} from "./src/config/appConfig";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Google GenAI client (User-Agent header required for telemetry)
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Server-side audit logging helper. Logs GenAI calls with sanitized media.
 *
 * @param model - Gemini model name.
 * @param prompt - Prompt or parts summary.
 * @param config - Options and configuration.
 * @param output - Output summary.
 */
function logServerGenAiCall(model: string, prompt: unknown, config: unknown, output?: unknown): void {
  const timestamp = new Date().toLocaleTimeString();
  console.info(`[${timestamp}] [SERVER_GENAI] Model: ${model}`);
  console.info(`  Prompt preview:`, typeof prompt === "string" ? prompt.slice(0, 140) : "[Structured parts]");
  if (output) {
    console.info(`  Output summary:`, typeof output === "string" ? output.slice(0, 140) : "[Data object]");
  }
}

/**
 * Strips data URL prefixes from base64 strings.
 *
 * @param dataUri - Raw data URI or base64 string.
 * @returns Clean base64 string.
 */
function cleanBase64Data(dataUri: string): string {
  if (dataUri.includes(",")) {
    return dataUri.split(",")[1];
  }
  return dataUri;
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

/**
 * Health check endpoint for uptime verification and runtime telemetry.
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: APP_CONFIG.appName,
    version: APP_CONFIG.appVersion,
    hasApiKey: !!geminiApiKey,
    defaultLanguage: APP_CONFIG.defaultLanguageCode,
  });
});

/**
 * Returns list of supported languages and system configurations.
 */
app.get("/api/languages", (_req: Request, res: Response) => {
  res.json({
    languages: APP_CONFIG.languages,
    trustStages: APP_CONFIG.trustLoopStages,
  });
});

/**
 * Screen Guidance & Trust Loop Analysis Endpoint.
 * Analyzes a screenshot of a Coinbase-style screen, breaks down fees,
 * surfaces risks, and returns both structured guidance and synthesized audio.
 */
app.post("/api/guidance", async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, languageCode, goal } = req.body;
    const lang = getLanguageConfig(languageCode || "fa");

    if (!image) {
      res.status(400).json({ error: "Missing required screen image" });
      return;
    }

    const cleanImageBase64 = cleanBase64Data(image);

    const promptText = `
You are Language Bridge, a trusted multilingual visual voice guide.
The user is navigating a crypto interface (like Coinbase) and their goal is: "${goal || lang.sampleGoal}".

IMPORTANT: The Coinbase trading screen is already provided and directly visible in the image. You CAN ALREADY SEE THIS SCREEN CLEARLY. Do NOT ask the user to "show your screen", "open your screen", or "share your screen". Explain the screen elements directly.

Examine the provided screen carefully. Follow the STRICT 4-STAGE TRUST LOOP:
1. Explain what is visible on this screen in simple, reassuring terms in ${lang.name} (${lang.nativeName}).
2. Surface all risks, Coinbase fees, network fees, spread, and the irreversibility of crypto purchases in plain language.
3. Formulate an explicit verbal confirmation question asking the user if they want to proceed (e.g. "Do you want me to guide you to click 'Preview Buy' now?").
4. Formulate the exact safe next step guidance.

Return your response in JSON format matching this schema:
{
  "title": "Short title describing the screen (e.g. Coinbase Buy Bitcoin Input)",
  "detectedAsset": "Name of cryptocurrency detected (e.g. Bitcoin / BTC)",
  "fiatAmount": "Amount in USD (e.g. $50.00)",
  "cryptoAmount": "Estimated crypto amount (e.g. ~0.00054 BTC)",
  "fees": [
    {
      "name": "Coinbase Fee",
      "amount": "$1.99",
      "description": "Fee charged by the exchange for processing",
      "isTransparent": true
    }
  ],
  "riskWarnings": [
    "Crypto purchases are irreversible once executed",
    "Asset prices are volatile"
  ],
  "confirmationPrompt": "Explicit question in ${lang.nativeName} asking verbal confirmation before guiding next action",
  "nextStepAdvice": "Specific instruction on which button to click or field to enter in ${lang.nativeName}",
  "spokenScript": "A natural, warm, reassuring script in ${lang.nativeName} (max 3-4 sentences) that clearly explains the screen, highlights fees, and ends by asking verbal confirmation",
  "trustStage": "verbal_confirmation"
}
`;

    logServerGenAiCall(APP_CONFIG.models.multimodalAnalyzer, promptText, {
      language: lang.code,
    });

    const visionResponse = await ai.models.generateContent({
      model: APP_CONFIG.models.multimodalAnalyzer,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanImageBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = visionResponse.text || "{}";
    let analysisData;
    try {
      analysisData = JSON.parse(responseText);
    } catch {
      analysisData = {
        title: "Screen Detected",
        detectedAsset: "Bitcoin",
        fiatAmount: "Detected on screen",
        cryptoAmount: "",
        fees: [],
        riskWarnings: ["Verify all trade parameters carefully."],
        confirmationPrompt: lang.agentGreeting,
        nextStepAdvice: "Inspect fields before continuing.",
        spokenScript: lang.agentGreeting,
        trustStage: "verbal_confirmation",
      };
    }

    // Attach raw text for display
    analysisData.rawTextResponse = analysisData.spokenScript || analysisData.confirmationPrompt;

    // Synthesize audio of the spoken script using Gemini Flash Lite TTS
    let synthesizedAudioBase64 = null;
    try {
      const scriptToSpeak = analysisData.spokenScript || analysisData.confirmationPrompt;
      if (scriptToSpeak) {
        logServerGenAiCall(APP_CONFIG.models.textToSpeech, scriptToSpeak, {
          voice: APP_CONFIG.audio.voiceName,
        });

        const ttsResponse = await ai.models.generateContent({
          model: APP_CONFIG.models.textToSpeech,
          contents: [
            {
              role: "user",
              parts: [{ text: scriptToSpeak }],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: APP_CONFIG.audio.voiceName },
              },
            },
          },
        });

        // Gemini Flash Lite TTS unary output is WAV audio
        synthesizedAudioBase64 =
          ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      }
    } catch (ttsErr) {
      console.warn("TTS generation error (skipping audio output):", ttsErr);
    }

    res.json({
      success: true,
      analysis: analysisData,
      audio: synthesizedAudioBase64,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in /api/guidance:", message);
    res.status(500).json({ error: message });
  }
});

// -----------------------------------------------------------------------------
// WEBSOCKET & GEMINI LIVE API INTEGRATION
// -----------------------------------------------------------------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs: WebSocket) => {
  console.info("⚡ New client connected to /live WebSocket");
  let activeLanguage = getLanguageConfig(APP_CONFIG.defaultLanguageCode);
  let liveSession: any = null;
  let isScreenFed = false;

  /**
   * Initializes or re-initializes the Gemini Live API session.
   *
   * @param langCode - Language code.
   * @param hasScreenBeenFed - Whether screen is currently fed.
   */
  async function setupLiveSession(langCode: string, hasScreenBeenFed = false): Promise<void> {
    activeLanguage = getLanguageConfig(langCode);
    isScreenFed = hasScreenBeenFed;
    console.info(`🎙️ Initializing Gemini Live session for language: ${activeLanguage.name} (${activeLanguage.code}), screenFed: ${isScreenFed}`);

    try {
      if (liveSession) {
        try {
          await liveSession.close?.();
        } catch {
          // Ignore close error
        }
        liveSession = null;
      }

      if (!geminiApiKey) {
        clientWs.send(
          JSON.stringify({
            type: "transcript",
            transcript: {
              role: "agent",
              text: getAgentGreeting(activeLanguage, isScreenFed),
              trustStage: "screen_parsing",
            },
          })
        );
        return;
      }

      const systemPrompt = buildSystemInstruction(activeLanguage, isScreenFed);

      logServerGenAiCall(APP_CONFIG.models.liveAudioVideo, systemPrompt, {
        voice: APP_CONFIG.audio.voiceName,
        modalities: ["AUDIO"],
      });

      liveSession = await ai.live.connect({
        model: APP_CONFIG.models.liveAudioVideo,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: APP_CONFIG.audio.voiceName },
            },
          },
          systemInstruction: systemPrompt,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            // Forward audio output chunk (24kHz PCM)
            const audioChunk =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioChunk && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  audio: audioChunk,
                })
              );
            }

            // Handle barge-in interruption signal
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              console.info("⚡ Live API model turn interrupted by user barge-in");
              clientWs.send(
                JSON.stringify({
                  type: "interrupted",
                  interrupted: true,
                })
              );
            }

            // Forward model output speech transcription
            const outputText =
              (message.serverContent as any)?.outputTranscription?.text ||
              (message.serverContent as any)?.outputAudioTranscription?.text;
            if (outputText && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "transcript",
                  transcript: {
                    role: "agent",
                    text: outputText,
                    trustStage: "verbal_confirmation",
                  },
                })
              );
            }

            // Forward user input speech transcription
            const inputText =
              (message.serverContent as any)?.inputTranscription?.text ||
              (message.serverContent as any)?.inputAudioTranscription?.text;
            if (inputText && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "transcript",
                  transcript: {
                    role: "user",
                    text: inputText,
                  },
                })
              );
            }
          },
          onclose: () => {
            console.info("Gemini Live session closed");
          },
          onerror: (err: any) => {
            console.error("Gemini Live session error:", err?.message || err);
          },
        },
      });

      // Send initial greeting to client transcript
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "status",
            status: "connected",
          })
        );
        clientWs.send(
          JSON.stringify({
            type: "transcript",
            transcript: {
              role: "agent",
              text: getAgentGreeting(activeLanguage, isScreenFed),
              trustStage: "screen_parsing",
            },
          })
        );
      }
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live API:", err?.message || err);
      // Fallback: Notify client of active connection so fallback guidance works
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "status",
            status: "connected",
          })
        );
        clientWs.send(
          JSON.stringify({
            type: "transcript",
            transcript: {
              role: "agent",
              text: getAgentGreeting(activeLanguage, isScreenFed),
              trustStage: "screen_parsing",
            },
          })
        );
      }
    }
  }

  clientWs.on("message", async (rawMessage: Buffer | string) => {
    try {
      const msg = JSON.parse(rawMessage.toString());

      if (msg.type === "init") {
        await setupLiveSession(
          msg.languageCode || APP_CONFIG.defaultLanguageCode,
          Boolean(msg.hasScreenBeenFed)
        );
        return;
      }

      // Handle screen visibility change notification
      if (msg.type === "screen_fed") {
        isScreenFed = Boolean(msg.hasScreenBeenFed ?? true);
        console.info(`🖥️ Screen visibility updated to ${isScreenFed} for language: ${activeLanguage.name}`);
        if (liveSession) {
          if (isScreenFed) {
            liveSession.sendRealtimeInput({
              text: `[SYSTEM CONTEXT: The built-in Coinbase Sandbox screen is present and visible. You can clearly see the Coinbase Bitcoin buy screen in front of you. Directly proceed to explain what is visible on screen following the 4-Stage Trust Loop in ${activeLanguage.name}.]`,
            });
          } else {
            liveSession.sendRealtimeInput({
              text: `[SYSTEM CONTEXT: The screen is no longer visible. Politely wait until the user makes the Coinbase screen visible or shares/uploads their screen before explaining screen elements.]`,
            });
          }
        }
        return;
      }

      // Handle explicit barge-in notification from client VAD
      if (msg.type === "barge_in") {
        console.info("⚡ Explicit barge-in message received from client");
        // Confirm interruption back to client to ensure immediate audio queue clearance
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: "interrupted",
              interrupted: true,
            })
          );
        }
        return;
      }

      // Stream audio chunk (16kHz PCM from mic)
      if (msg.type === "audio" && msg.audio && liveSession) {
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      }

      // Stream video / screen capture frame (JPEG)
      if (msg.type === "video" && msg.video && liveSession) {
        if (!isScreenFed) {
          isScreenFed = true;
          liveSession.sendRealtimeInput({
            text: `[SYSTEM CONTEXT: The user has now fed their Coinbase screen frame to you. You can now see the screen clearly in front of you. Explain what is on screen following the 4-Stage Trust Loop in ${activeLanguage.name}.]`,
          });
        }
        const cleanFrame = cleanBase64Data(msg.video);
        liveSession.sendRealtimeInput({
          video: {
            data: cleanFrame,
            mimeType: "image/jpeg",
          },
        });
      }

      // User text input or guided goal
      if (msg.type === "text" && msg.text && liveSession) {
        liveSession.sendRealtimeInput({
          text: msg.text,
        });
      }
    } catch (err) {
      console.error("Error processing client WebSocket message:", err);
    }
  });

  clientWs.on("close", () => {
    console.info("Client disconnected from /live");
    if (liveSession) {
      try {
        liveSession.close?.();
      } catch {
        // Ignore close error
      }
      liveSession = null;
    }
  });
});

// -----------------------------------------------------------------------------
// VITE INTEGRATION IN DEV & STATIC SERVING IN PRODUCTION
// -----------------------------------------------------------------------------

async function startServer(): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.info(`🚀 Language Bridge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server start error:", err);
});
