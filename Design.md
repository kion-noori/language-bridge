# Language Bridge: Multilingual Visual Voice Guide Agent
*Hackathon Prototype for the New Agentic Economy Hackathon (Google DeepMind × Forever 22)*

---

## 1. Executive Summary & Problem Statement

Millions of non-native English speakers, immigrants, and tech-hesitant individuals around the world possess financial literacy or domain understanding in their native language, but freeze when confronted with dense, high-stakes English digital interfaces.

For example, an Iranian immigrant who regularly follows Farsi cryptocurrency market analysis and understands Bitcoin market dynamics may hesitate or make catastrophic errors when trying to navigate Coinbase, Binance, or banking portals due to complex English jargon, hidden fees, unfamiliar UX terminology ("Slippage", "Limit vs Market", "Network Fee", "Review Order"), and fear of clicking the wrong button.

**Language Bridge** is an agentic, multimodal visual voice guide powered by **Gemini Live API (`gemini-3.8-live`)**. It acts as a trusted companion looking over the user's shoulder in real time:
1. **Sees** what is on the screen (via screen share, screenshot, camera, or interactive simulator).
2. **Speaks & Listens** continuously in the user's native tongue (e.g., Farsi/Persian, Spanish, Arabic, Hindi, Vietnamese) with zero-latency barge-in (interruption).
3. **Executes the 4-Stage Trust Loop**: Explains elements -> Surfaces hidden risks/fees -> Requests explicit verbal confirmation -> Only then provides clear instructions for the next action.
4. **Enforces Absolute Safety**: Operates strictly as an educational guide; **never executes transactions, never clicks buttons, and never accesses user credentials**.

---

## 2. Core Architecture & Technical Flow

```
+-----------------------------------------------------------------------------------------+
|                                    USER CLIENT (Browser)                                |
|                                                                                         |
|  +------------------------+  +----------------------------+  +------------------------+ |
|  |  Screen Capture Panel  |  |   Web Audio API System     |  | Interactive Simulator  | |
|  |  - Screen Share API    |  |  - 16kHz PCM Mic Capture   |  |  - Coinbase Buy Screen | |
|  |  - Screenshot Upload   |  |  - 24kHz PCM Audio Playback|  |  - Amount, Fees, Steps  | |
|  |  - 1 FPS Frame Push    |  |  - Instant Barge-In Cancel |  |  - Live Sync with Guide| |
|  +-----------+------------+  +--------------+-------------+  +------------------------+ |
|              |                              |                                            |
+--------------|------------------------------|--------------------------------------------+
               | Video Frames (JPEG base64)   | Audio PCM / Transcripts
               v                              v
+-----------------------------------------------------------------------------------------+
|                               EXPRESS + WEBSOCKET SERVER                                 |
|                                                                                         |
|  - Manages WebSocket Session at /live                                                   |
|  - Injects System Instruction with Language Persona & Trust Loop Protocol               |
|  - Relays Bidirectional Streams to Google GenAI SDK                                     |
|  - High-Reliability Fallback Engine: /api/guidance (Gemini Flash + Flash Lite TTS)      |
+-----------------------------------------------------------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------------+
|                              GOOGLE GEMINI LIVE API ENGINE                              |
|                                                                                         |
|  - Model: gemini-3.8-live                                                                |
|  - Realtime Modalities: AUDIO + TEXT                                                    |
|  - Streaming Multimodal Input: session.sendRealtimeInput({ audio, video })              |
|  - Realtime Audio Output + Barge-In Interruption Signals                                |
|  - Input & Output Audio Transcription                                                   |
+-----------------------------------------------------------------------------------------+
```

---

## 3. The 4-Stage Trust Loop Protocol

Trust is paramount when dealing with financial interfaces. Language Bridge hardcodes a strict **Trust Loop** into both its prompt architecture and user interface:

| Stage | Name | Description | Agent Action |
|---|---|---|---|
| **1** | **Visual Screen Parsing** | Identifies all visible controls, input fields, balances, and exchange rates. | Describes what is on screen in simple, non-intimidating native language. |
| **2** | **Risk & Fee Disclosure** | Translates financial mechanics (Coinbase fee, spread, network cost, irreversibility). | Clearly highlights total cost: *"Coinbase is charging $2.99 fee and Bitcoin purchases cannot be cancelled once submitted."* |
| **3** | **Explicit Verbal Confirmation** | Demands active human consent before moving forward. | Asks directly: *"Are you ready for me to guide you to the preview screen? Please say yes or no."* |
| **4** | **Safe Non-Custodial Step** | Guides the user's hand without taking autonomous control. | Explains the exact button to press: *"Click the blue button labeled 'Preview Buy'. I will inspect the next screen with you."* |

---

## 4. Key Features & Implementation Modules

### 4.1. Gemini Live API Integration (`server.ts` & `src/services/liveClient.ts`)
- Utilizes `@google/genai` SDK `ai.live.connect` with model `gemini-3.8-live`.
- Supports bidirectional low-latency audio:
  - Mic capture downsampled to 16kHz mono PCM via Web Audio `ScriptProcessorNode`.
  - Assistant voice streamed back as 24kHz raw PCM and scheduled seamlessly through an `AudioContext` buffer queue.
  - Barge-in: when user speaks while the model is responding, server transmits `interrupted: true`, immediately halting local playback and flushing audio queues.
- Real-time frame streaming: captures video frame at ~1 FPS (or snapshot triggers) and feeds it to `session.sendRealtimeInput({ video: { data, mimeType: 'image/jpeg' } })`.

### 4.2. Multilingual Support Engine (`src/config/appConfig.ts` & `src/components/LanguageSelector.tsx`)
- Priority Language: **Farsi / Persian (`fa` - فارسی)** with customized system instructions, native greetings, and right-to-left layout accommodations.
- Additional Supported Languages:
  - Spanish (`es` - Español)
  - Arabic (`ar` - العربية)
  - Turkish (`tr` - Türkçe)
  - Chinese (`zh` - 中文)
  - Hindi (`hi` - हिन्दी)
  - Vietnamese (`vi` - Tiếng Việt)
  - French (`fr` - Français)
  - English (`en`)
- The agent adapts tone to be calm, culturally respectful, patient, and pedagogical.

### 4.3. Interactive Coinbase Buy Bitcoin Simulator (`src/components/CoinbaseSimulator.tsx`)
- Provides an immediate sandbox for evaluators, hackathon judges, and test users without requiring actual Coinbase logins or financial risk.
- Includes realistic Coinbase UX:
  - Crypto asset selector (BTC Bitcoin, ETH Ethereum, SOL Solana).
  - USD purchase amount presets ($10, $25, $50, $100, custom).
  - Payment method dropdown (Bank account, Debit card, Cash balance).
  - Dynamic fee calculation (Purchase amount, Coinbase fee, Network fee, Estimated BTC).
  - Multi-step flow: Enter Amount -> Order Preview -> Order Confirmation.
  - Directly connectable to the guide agent's visual capture engine with a single click.

### 4.4. Multimodal Screen Ingestion (`src/components/ScreenCapturePanel.tsx`)
- Three input modalities:
  1. **Built-in Sandbox**: Direct canvas capture of the interactive Coinbase interface.
  2. **Screen Share**: `navigator.mediaDevices.getDisplayMedia` allowing users to guide real tabs, mobile displays, or desktop windows.
  3. **File Upload / Camera**: Uploading screenshots or pointing a device camera at an external monitor.

### 4.5. Live Bilingual Transcript & Audit Trail (`src/components/TranscriptFeed.tsx`)
- Real-time display of user utterance and agent voice response.
- Generates dual representation (Native language e.g. Farsi + English translation preview) for total transparency.
- Tags messages with Trust Loop phase badges (Screen Analysis, Risk Warning, Confirmation Request, Step Instruction).

### 4.6. Dual-Mode Resilience Fallback (`src/services/guidanceService.ts`)
- In addition to WebSocket Live API, includes a server-side REST endpoint (`/api/guidance`) powered by `gemini-3.8-flash` and `gemini-3.8-flash-lite-tts`.
- Ensures that if a user is in a strict corporate network blocking WebSockets, or testing on mobile browsers with restricted audio capabilities, the agent continues to function without error.

---

## 5. Security & Regulatory Compliance Boundary

1. **Non-Custodial**: The app never connects to wallets, never asks for private keys, seed phrases, or API credentials.
2. **No Autonomous Execution**: The agent does not click buttons, submit orders, or transfer funds.
3. **Disclaimers**: Permanent educational banners and an interactive disclaimer modal clarify that guidance is for interface literacy only and does not constitute financial, legal, or investment advice.
4. **Zero Browser Key Exposure**: All Gemini calls run server-side via `server.ts` using `process.env.GEMINI_API_KEY`.

---

## 6. Centralized Logging & Configuration Standards

- **Config**: Centralized in `src/config/appConfig.ts` (model identifiers, voices, sample rates, prompt directives, fee formulas).
- **Logger**: Centralized in `src/utils/logger.ts`. Automatically logs all internal function invocations with parameters and all Gemini API requests/responses (with image/audio payloads sanitized to prevent memory bloat).
