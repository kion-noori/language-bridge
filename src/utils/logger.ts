/**
 * @file logger.ts
 * =============================================================================
 * CENTRALIZED AUDIT & DEBUG LOGGING UTILITY
 * =============================================================================
 * This utility standardizes all logging operations throughout the application.
 *
 * Specific Hackathon & Agentic Requirements:
 * 1. Log as INFO all function calls along with their parameters.
 * 2. Log all Gemini / GenAI calls with all their parameters (model used,
 *    prompt, configuration) and outputs, while stripping large inline base64
 *    payloads (such as audio PCM chunks and screen frame images) to prevent
 *    memory bloat and log spam.
 * 3. Maintain an in-memory event buffer of the latest system logs so that the
 *    user or evaluators can inspect the runtime audit trail directly within
 *    the application UI.
 * =============================================================================
 */

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "genai";
  category: string;
  name: string;
  details?: Record<string, unknown> | unknown;
}

const MAX_LOG_ENTRIES = 150;
const memoryLogs: SystemLogEntry[] = [];
const logListeners: Array<(entry: SystemLogEntry) => void> = [];

/**
 * Strips heavy inline base64 payloads (e.g. data URLs, binary arrays)
 * from objects before logging.
 *
 * @param obj - The arbitrary input object or payload.
 * @returns A sanitized clone safe for logging.
 */
function sanitizePayload(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.startsWith("data:image/") || obj.length > 300) {
      return `[String truncated: length=${obj.length}, preview=${obj.slice(0, 30)}...]`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item));
  }
  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (
        key.toLowerCase().includes("inline") ||
        key.toLowerCase().includes("data") ||
        key.toLowerCase().includes("base64") ||
        key.toLowerCase().includes("pcm") ||
        key.toLowerCase().includes("image") ||
        key.toLowerCase().includes("audio")
      ) {
        if (typeof val === "string") {
          sanitized[key] = `[Binary/Base64 data truncated (${val.length} bytes)]`;
          continue;
        }
      }
      sanitized[key] = sanitizePayload(val);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Records a structured log entry into the internal circular buffer and console.
 *
 * @param level - Log severity level.
 * @param category - Domain category (e.g., 'AUDIO', 'SCREEN', 'LIVE_SESSION', 'GENAI').
 * @param name - Function or operation identifier.
 * @param details - Parameters or result object.
 */
function recordLog(
  level: "info" | "warn" | "error" | "genai",
  category: string,
  name: string,
  details?: unknown
): void {
  const sanitizedDetails = sanitizePayload(details);
  const entry: SystemLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString(),
    level,
    category,
    name,
    details: sanitizedDetails,
  };

  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_LOG_ENTRIES) {
    memoryLogs.pop();
  }

  // Console output
  const prefix = `[${entry.timestamp}] [${category.toUpperCase()}] ${name}`;
  if (level === "info") {
    console.info(prefix, sanitizedDetails || "");
  } else if (level === "genai") {
    console.info(`✨ ${prefix} (GenAI Call)`, sanitizedDetails || "");
  } else if (level === "warn") {
    console.warn(`⚠️ ${prefix}`, sanitizedDetails || "");
  } else if (level === "error") {
    console.error(`🚨 ${prefix}`, sanitizedDetails || "");
  }

  // Notify active UI subscribers
  for (const listener of logListeners) {
    try {
      listener(entry);
    } catch {
      // Ignore listener error
    }
  }
}

/**
 * Logs an informational event.
 *
 * @param category - Subsystem category.
 * @param message - Message or operation title.
 * @param details - Contextual payload.
 */
export function logInfo(
  category: string,
  message: string,
  details?: Record<string, unknown> | unknown
): void {
  recordLog("info", category, message, details);
}

/**
 * Logs an internal function call with its input parameters at INFO level.
 *
 * @param category - Subsystem category.
 * @param functionName - Name of the invoked function.
 * @param parameters - Argument payload.
 */
export function logFunctionCall(
  category: string,
  functionName: string,
  parameters?: Record<string, unknown> | unknown
): void {
  recordLog("info", category, functionName, parameters);
}

/**
 * Logs a Gemini Generative AI SDK invocation with model parameters, prompt, and output.
 * Strips raw media bytes while preserving tokens, parameters, and generated text.
 *
 * @param model - Gemini model string.
 * @param prompt - Text prompt or structured input parts.
 * @param config - Generation configuration.
 * @param output - Response or streamed chunk summary.
 */
export function logGenAiCall(
  model: string,
  prompt: unknown,
  config: unknown,
  output?: unknown
): void {
  recordLog("genai", "GEMINI_API", "ai.models.invoke", {
    model,
    prompt: sanitizePayload(prompt),
    config: sanitizePayload(config),
    output: sanitizePayload(output),
  });
}

/**
 * Logs an error event with contextual information.
 *
 * @param category - Subsystem category.
 * @param operationName - Failed operation name.
 * @param error - Caught error or failure message.
 */
export function logError(
  category: string,
  operationName: string,
  error: unknown
): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  recordLog("error", category, operationName, { error: errMessage });
}

/**
 * Returns a read-only snapshot of recent in-memory log entries.
 *
 * @returns Array of system log entries.
 */
export function getSystemLogs(): readonly SystemLogEntry[] {
  return memoryLogs;
}

/**
 * Subscribes a callback to receive real-time log entries.
 *
 * @param listener - Callback triggered on each new entry.
 * @returns Unsubscribe clean-up function.
 */
export function subscribeToLogs(
  listener: (entry: SystemLogEntry) => void
): () => void {
  logListeners.push(listener);
  return () => {
    const idx = logListeners.indexOf(listener);
    if (idx !== -1) {
      logListeners.splice(idx, 1);
    }
  };
}
