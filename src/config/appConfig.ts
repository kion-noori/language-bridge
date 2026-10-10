/**
 * @file appConfig.ts
 * =============================================================================
 * CENTRALIZED APPLICATION CONFIGURATION & RUNTIME PARAMETERS
 * =============================================================================
 * This module defines all centralized settings for the Language Bridge Visual
 * Voice Guide prototype. Grouping all configuration parameters in one dedicated
 * module ensures single-source-of-truth governance across both frontend and
 * backend execution paths.
 *
 * Use Cases:
 * 1. Model Selection & Fallback Routing:
 *    - Primary real-time interactive voice model: 'gemini-3.8-live'
 *    - Multimodal fast-reasoning fallback model: 'gemini-3.8-flash'
 *    - Text-to-speech audio synthesis model: 'gemini-3.8-flash-lite-tts'
 * 2. Voice Configuration & Prebuilt Voices:
 *    - High naturalness voice assignment ('Zephyr', 'Kore', 'Fenrir', 'Puck', 'Charon')
 * 3. Audio Processing Rates:
 *    - Microphone downsampling target: 16,000 Hz PCM (Mono, 16-bit signed integer)
 *    - Model output playback sample rate: 24,000 Hz PCM
 * 4. Multilingual Matrix with Farsi (fa) Priority:
 *    - Definitions of supported languages, native display labels, RTL markers,
 *      and specialized localized system prompts.
 * 5. Trust Loop Protocol Configuration:
 *    - Definitions of the 4 key stages: Screen Analysis, Risk Disclosure,
 *      Verbal Confirmation, and Step Guidance.
 * 6. Safety and Disclaimer Policies:
 *    - Financial non-advice boundaries and non-custodial operating constraints.
 * =============================================================================
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  isRtl?: boolean;
  priority?: boolean;
  sampleGoal: string;
  agentGreeting: string;
  confirmationPhrases: string[];
}

export const APP_CONFIG = {
  appName: "Language Bridge",
  appVersion: "1.0.0-hackathon",

  // Gemini AI Models
  models: {
    // Primary Live API voice & video model
    liveAudioVideo: "gemini-3.8-live",
    // Alternative Live thinking model if deeper reasoning is enabled
    liveExtendedThinking: "gemini-3.8-live-extended-thinking",
    // Unary multimodal screen analysis fallback
    multimodalAnalyzer: "gemini-3.8-flash",
    // Fast TTS synthesis fallback
    textToSpeech: "gemini-3.8-flash-lite-tts",
  },

  // Audio Specifications
  audio: {
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    bufferSize: 4096,
    channels: 1,
    voiceName: "Zephyr", // 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
  },

  // Video and Screen Capture Streaming Parameters
  screenStreaming: {
    framesPerSecond: 1, // 1 frame per second interval for live screen push
    jpegQuality: 0.8,
    maxDimension: 1024, // Resize frame to max 1024px to preserve network bandwidth
  },

  // Temporary Visual Highlight Configuration (Coinbase Sandbox only)
  highlight: {
    durationMs: 4500, // 4.5 seconds duration (within 4-5 seconds) before disappearing
    pulseIntervalMs: 1000,
  },

  // Supported Languages
  languages: [
    {
      code: "fa",
      name: "Persian / Farsi",
      nativeName: "فارسی",
      isRtl: true,
      priority: true,
      sampleGoal: "می‌خواهم با خیال راحت یک مقدار کم بیت‌کوین بخرم.",
      agentGreeting: "سلام! من همراه راهنمای شما هستم و به فارسی راهنمایی‌تان می‌کنم. لطفاً شبیه‌ساز خرید کوین‌بیس را در صفحه به پایین اسکرول کنید تا تصویر آن را ببینم. چه کمکی از دست من برمی‌آید؟",
      confirmationPhrases: ["بله", "تایید است", "ادامه بده", "می‌خواهم ادامه دهم"],
    },
    {
      code: "es",
      name: "Spanish",
      nativeName: "Español",
      isRtl: false,
      sampleGoal: "Quiero comprar una pequeña cantidad de Bitcoin de forma segura.",
      agentGreeting: "¡Hola! Soy tu guía visual y te hablaré en español. Desplázate hacia abajo hasta el simulador de Coinbase para que pueda ver la pantalla de compra. ¿Cómo te puedo ayudar?",
      confirmationPhrases: ["sí", "de acuerdo", "continuar", "estoy listo"],
    },
    {
      code: "ar",
      name: "Arabic",
      nativeName: "العربية",
      isRtl: true,
      sampleGoal: "أريد شراء كمية صغيرة من البيتكوين بأمان.",
      agentGreeting: "مرحباً! أنا دليلك المساعد وسأتحدث معك باللغة العربية. يرجى التمرير لأسفل إلى محاكي كوينبيس حتى أتمكن من رؤية شاشة الشراء. كيف يمكنني مساعدتك؟",
      confirmationPhrases: ["نعم", "موافق", "تابع", "أنا مستعد"],
    },
    {
      code: "tr",
      name: "Turkish",
      nativeName: "Türkçe",
      isRtl: false,
      sampleGoal: "Güvenli bir şekilde küçük bir miktar Bitcoin almak istiyorum.",
      agentGreeting: "Merhaba! Türkçe rehberinizim. Satın alma ekranını görebilmem için lütfen Coinbase simülatörüne doğru aşağı kaydırın. Nasıl yardımcı olabilirim?",
      confirmationPhrases: ["evet", "tamam", "devam et", "hazırım"],
    },
    {
      code: "hi",
      name: "Hindi",
      nativeName: "हिन्दी",
      isRtl: false,
      sampleGoal: "मैं सुरक्षित रूप से थोड़ी मात्रा में बिटकॉइन खरीदना चाहता हूँ।",
      agentGreeting: "नमस्ते! मैं आपका गाइड हूँ। खरीद स्क्रीन देखने के लिए कृपया नीचे कॉइनबेस सिम्युलेटर तक स्क्रॉल करें। मैं आपकी क्या मदद कर सकता हूँ?",
      confirmationPhrases: ["हाँ", "ठीक है", "आगे बढ़ो", "तैयार हूँ"],
    },
    {
      code: "vi",
      name: "Vietnamese",
      nativeName: "Tiếng Việt",
      isRtl: false,
      sampleGoal: "Tôi muốn mua một lượng nhỏ Bitcoin an toàn.",
      agentGreeting: "Xin chào! Tôi là người hướng dẫn của bạn. Vui lòng cuộn xuống trình mô phỏng Coinbase để tôi có thể nhìn thấy màn hình mua. Tôi có thể giúp gì cho bạn?",
      confirmationPhrases: ["có", "đồng ý", "tiếp tục", "tôi đã sẵn sàng"],
    },
    {
      code: "zh",
      name: "Mandarin Chinese",
      nativeName: "中文",
      isRtl: false,
      sampleGoal: "我想安全地购买少量比特币。",
      agentGreeting: "您好！我是您的向导。请向下滚动至Coinbase模拟器，以便我能看清购买界面并为您提供指导。请问有什么可以帮您？",
      confirmationPhrases: ["好的", "是的", "继续", "我准备好了"],
    },
    {
      code: "en",
      name: "English",
      nativeName: "English",
      isRtl: false,
      sampleGoal: "I want to buy a small amount of Bitcoin safely.",
      agentGreeting: "Hello! I am your voice guide. Please scroll down to the Coinbase Sandbox so I can see the buy screen and help you navigate safely.",
      confirmationPhrases: ["yes", "proceed", "continue", "I confirm"],
    },
  ] as SupportedLanguage[],

  // Default Language
  defaultLanguageCode: "fa",

  // Trust Loop Stages
  trustLoopStages: [
    {
      id: "screen_parsing",
      label: "1. Screen Parsing",
      description: "Explaining visible elements & amounts in your native language",
    },
    {
      id: "risk_disclosure",
      label: "2. Risk & Fee Disclosure",
      description: "Surfacing network fees, spreads, and irreversibility in plain words",
    },
    {
      id: "verbal_confirmation",
      label: "3. Verbal Confirmation",
      description: "Waiting for your explicit verbal permission before moving forward",
    },
    {
      id: "guided_next_step",
      label: "4. Safe Next Step",
      description: "Guiding which specific button or field to interact with next",
    },
  ],

  // Safety Disclaimers
  safety: {
    disclaimerText:
      "Language Bridge provides educational interface guidance only and does NOT provide financial, legal, or investment advice. The agent never executes trades, never takes custody of funds, and cannot place orders on your behalf. You remain in complete control of your account at all times.",
    shortDisclaimer: "Educational Interface Guidance Only • Not Financial Advice",
  },
} as const;

/**
 * Retrieves the language configuration object for a specified language code.
 *
 * @param code - The ISO-like language code (e.g. 'fa', 'es', 'ar').
 * @returns The matching SupportedLanguage record or the default language.
 */
export function getLanguageConfig(code: string): SupportedLanguage {
  const found = APP_CONFIG.languages.find((lang) => lang.code === code);
  if (found) {
    return found;
  }
  return APP_CONFIG.languages[0]; // defaults to Farsi
}

/**
 * Constructs the rigorous System Instruction prompt enforcing the Trust Loop,
 * language adaptation, and non-custodial boundaries.
 *
 * @param language - The target language configuration.
 * @returns Comprehensive system prompt string for the Gemini Live or Flash model.
 */
export function buildSystemInstruction(language: SupportedLanguage): string {
  return `You are "Language Bridge", an empathetic, highly trusted real-time visual voice guide agent built for the New Agentic Economy.

TARGET AUDIENCE & CONTEXT:
The user is a non-native English speaker (speaking in ${language.name} - ${language.nativeName}) navigating complex, intimidating English-language digital interfaces (specifically crypto trading screens like Coinbase). They understand the concepts but freeze when facing English financial jargon, buttons, fees, and multi-step forms.

YOUR CORE MANDATES (NEVER VIOLATE):
1. LANGUAGE: You MUST ALWAYS speak and respond strictly in ${language.name} (${language.nativeName}). Use calm, natural, conversational, polite speech.
2. STRICT TRUST LOOP: Whenever analyzing the user's screen or receiving a question, you must follow this 4-step sequence:
   Step A (Explain Screen): Tell the user what you see on the screen clearly and point to specific elements (e.g., the Bitcoin price, the "$50" input box, payment method dropdown).
   Step B (Surface Risks & Fees in Plain Language): Disclose what costs or risks exist. For example, explain the Coinbase transaction fee, the network cost, the spread, and remind them that crypto transactions cannot be undone.
   Step C (Ask for Explicit Verbal Confirmation): You MUST ask for explicit verbal confirmation before guiding them to the next action! For example: "Do you want me to guide you to click 'Preview Buy' now?" or "آیا مایلید شما را برای زدن دکمه پیش‌نمایش خرید راهنمایی کنم؟"
   Step D (Guide Next Step): ONLY AFTER the user confirms verbally ("Yes", "بله", "Continue"), guide them which button to press or what to enter. Never jump ahead.
3. NON-CUSTODIAL & NO DIRECT ACTION: You are a guide ONLY. You do NOT execute trades, you do NOT click buttons, and you cannot place orders. You only guide the human user.
4. EDUCATIONAL ONLY: This is interface literacy and translation guidance, NEVER financial, legal, or investment advice.
5. SCREEN CLARITY: If the screen is blurry or occluded, gently ask the user to adjust the window or upload a clearer screenshot.
6. BARGE-IN AWARE: The user may interrupt you at any moment. Keep answers succinct, warm, reassuring, and focused. Avoid lengthy monologues.
7. VIEWPORT DETECTION & BUY SCREEN VISIBILITY: The Coinbase crypto buy screen is only visible to you when the user scrolls it into view. If you have not yet received an image/video frame of the Coinbase buy screen, you MUST NOT claim, assume, or hallucinate that you already see the buy screen, Bitcoin price, fees, or buttons! If the user asks for guidance before the buy screen is in view, politely tell them in ${language.name} (${language.nativeName}) to scroll down to the Coinbase Sandbox so you can see it and inspect it together. Once the screen frame arrives, proceed to explain what you see.`;
}
