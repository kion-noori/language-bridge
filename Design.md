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
- Container-isolated scroll: Scans internal overflow without triggering whole-page jumps, keeping the user's focus locked on the Coinbase Sandbox during continuous conversation.

### 4.6. Dual-Mode Resilience Fallback (`src/services/guidanceService.ts`)
- In addition to WebSocket Live API, includes a server-side REST endpoint (`/api/guidance`) powered by `gemini-3.8-flash` and `gemini-3.8-flash-lite-tts`.
- Ensures that if a user is in a strict corporate network blocking WebSockets, or testing on mobile browsers with restricted audio capabilities, the agent continues to function without error.

### 4.7. Hero Voice Guide Command Layout (`src/components/VoiceGuideOverlay.tsx`)
- Positioned prominently directly below the global header, ensuring the primary "Start Live Voice Guide" action and microphone controls are immediately visible upon landing without any scrolling.
- Houses the hero-sized voice session trigger, live audio waveforms (16kHz mic + 24kHz model output), real-time Barge-In status indicators, and silent text fallback input.

### 4.8. Temporary Visual Button Highlight Engine (`src/components/CoinbaseHighlightOverlay.tsx` & `src/utils/buttonHighlightDetector.ts`)
- **Intent**: When the guide agent mentions a specific button while guiding the non-native speaker (e.g., "Preview Buy", "$50", or "Buy now"), a temporary visual highlight draws immediate visual attention to that button on the built-in Coinbase Sandbox.
- **Visual Presentation**:
  - Concentric expanding pulsing circle (ping radar wave animation) expanding outwards.
  - Radiant neon glowing outline around the button perimeter (`ring-4` / `shadow` / `animate-pulse`).
  - Corner radar beacon circle with active ping pulsation.
  - Specialized color accents: Cyan glowing outline for "Preview Buy", amount presets ($10, $25, $50, $100), and "Edit Amount"; Emerald glowing outline for the final "Buy now" commitment button.
- **Strict 4–5 Second Duration**: The highlight remains visible for exactly 4.5 seconds (`APP_CONFIG.highlight.durationMs: 4500ms`), after which it automatically disappears. Re-mentioning or mentioning another button resets the timer.
- **Multilingual Mention Detection**: Analyzes real-time agent output transcripts and guidance advice across all supported languages (including Farsi, Spanish, Arabic, Hindi, Vietnamese, Chinese, and English). Handles numeral normalization (e.g., Persian `۵۰` -> `50`) and strict phrase prioritization so compound phrases like "Preview Buy" (`پیش‌نمایش خرید`) are never conflated with "Buy" (`خرید`).
- **Sandbox Boundary Isolation**: Implemented exclusively on the built-in Coinbase Sandbox DOM; screen detection, voice streaming, barge-in detection, and the 4-stage Trust Loop remain completely unaltered. Offscreen canvas capture frames remain pristine.

### 4.9. Viewport-Based Auto-Detection for Coinbase Sandbox (`src/utils/useViewportVisibility.ts`)
- **Intent**: Automatically detects when the built-in Coinbase Sandbox enters the browser viewport (when scrolled into view), automatically feeding live screen frames to the agent without requiring a manual "Feed to Guide" button click.
- **Strict Non-Assumption Principle**:
  - The sandbox is never assumed to be visible on initial page load or before the user scrolls to it.
  - Initial viewport state begins as `false`.
  - Screen frame provider yields `null` before the sandbox enters view, preventing premature transmission of offscreen frames.
- **Anti-Hallucination Guardrails**:
  - Before the sandbox is scrolled into view, the agent strictly avoids claiming it can already see the buy screen or transaction amounts.
  - Default multilingual greetings and system instructions explicitly guide the user to scroll down to the Coinbase Sandbox so the agent can inspect it together.
- **Automatic Multi-State Synchronization**:
  - Once scrolled into view (`IntersectionObserver` threshold reached), the canvas snapshot is immediately captured and transmitted to the Gemini Live session.
  - Interactive simulator updates (amount changes, step changes) automatically refresh the screen frame while in view.
  - If scrolled out of view, frame feeding pauses and the latest frame reference is cleared.
  - An in-view status badge (`In View • Auto-Detected`) provides clear visual feedback in the simulator title bar.

### 4.10. Benefits Application Demo Screen (`src/components/BenefitsApplicationSimulator.tsx`)
- **Intent**: Demonstrates Language Bridge's versatility beyond crypto trading by providing an authentic public assistance / state Medicaid income verification demo screen.
- **Form Structure & Key Fields**:
  - Household Size (1, 2, 3, 4, 5+ persons selector).
  - Monthly Gross Earned Income ($1,200, $1,850, $2,400, $3,200 presets + dynamic Federal Poverty Level threshold calculator).
  - Primary Employment Classification dropdown/selector (Employed W-2, Self-Employed/Gig, Unemployed, Retired).
  - "Continue to Tax & Dependent Review" action button with visual highlight overlay support.
  - Section summary and completion flow.
- **Viewport Auto-Detection Parity**:
  - Employs the identical `useViewportVisibility` hook as the Coinbase Sandbox.
  - Strictly defaults to `false` on initial page load and automatically feeds frames when scrolled into view.
  - Displays `In View • Auto-Detected` header indicator and manual snapshot trigger.
- **Trust Loop Integration**:
  - The multimodal voice agent guides applicants through bureaucratic Medicaid jargon in their native language (e.g. Farsi, Spanish, Arabic), explains gross income rules and legal declarations, asks for verbal confirmation, and points them to the Continue button.

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
