/**
 * @file audioPlayer.ts
 * =============================================================================
 * 24kHz PCM AUDIO STREAM PLAYER WITH BARGE-IN INTERRUPTION SUPPORT
 * =============================================================================
 * This module plays real-time audio streams received from the Gemini Live API.
 * The model sends audio as headerless 24,000 Hz, 16-bit linear PCM little-endian
 * chunks.
 *
 * Use Cases:
 * 1. Initializing a dedicated 24kHz Web Audio `AudioContext`.
 * 2. Queuing and scheduling PCM chunks seamlessly with sample-accurate timing
 *    to prevent audio jitter or click artifacts.
 * 3. Immediate barge-in handling: when the user speaks, the server or VAD
 *    signals `interrupted: true`. The player instantly stops all playing nodes,
 *    clears the scheduled queue, and resets the playback cursor to `currentTime`.
 * 4. Tracking playback activity state to update UI indicators ("Speaking", "Listening").
 * =============================================================================
 */

import { APP_CONFIG } from "../config/appConfig";
import { logError, logFunctionCall } from "../utils/logger";

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;

  /**
   * Initializes the AudioPlayer with an optional playback state change listener.
   *
   * @param onPlaybackStateChange - Callback triggered when agent starts or stops speaking.
   */
  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange || null;
    logFunctionCall("AUDIO_PLAYER", "constructor", {});
  }

  /**
   * Ensures the internal 24kHz AudioContext is initialized and unmuted.
   */
  private ensureContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtxClass({
        sampleRate: APP_CONFIG.audio.outputSampleRate,
      });
      this.nextPlayTime = this.audioContext.currentTime;
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /**
   * Decodes a base64 string of 16-bit PCM little-endian data into a Float32Array.
   *
   * @param base64Pcm - Base64 encoded raw PCM bytes.
   * @returns Float32Array of normalized audio samples (-1.0 to 1.0).
   */
  private base64ToFloat32(base64Pcm: string): Float32Array {
    const binary = window.atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }

  private isInterruptedUntil = 0;

  /**
   * Queues and schedules a chunk of base64-encoded 24kHz PCM for playback.
   *
   * @param base64AudioChunk - Base64 raw PCM chunk.
   */
  public playChunk(base64AudioChunk: string): void {
    // If we were just interrupted, drop trailing packets for a short window
    if (Date.now() < this.isInterruptedUntil) {
      return;
    }

    try {
      const ctx = this.ensureContext();
      const float32Data = this.base64ToFloat32(base64AudioChunk);
      if (float32Data.length === 0) return;

      const audioBuffer = ctx.createBuffer(
        1,
        float32Data.length,
        APP_CONFIG.audio.outputSampleRate
      );
      audioBuffer.getChannelData(0).set(float32Data);

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      sourceNode.start(this.nextPlayTime);
      this.activeSourceNodes.push(sourceNode);

      if (!this.isPlaying) {
        this.isPlaying = true;
        if (this.onPlaybackStateChange) this.onPlaybackStateChange(true);
      }

      const duration = audioBuffer.duration;
      this.nextPlayTime += duration;

      sourceNode.onended = () => {
        const index = this.activeSourceNodes.indexOf(sourceNode);
        if (index !== -1) {
          this.activeSourceNodes.splice(index, 1);
        }
        if (this.activeSourceNodes.length === 0) {
          this.isPlaying = false;
          if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
        }
      };
    } catch (error) {
      logError("AUDIO_PLAYER", "playChunk", error);
    }
  }

  /**
   * Instantly stops playback and flushes queued audio (Barge-in / interruption).
   * Drops any in-flight chunks that arrive immediately after interruption.
   *
   * @param suppressDurationMs - Duration in milliseconds to discard trailing in-flight chunks.
   */
  public stopAndFlush(suppressDurationMs: number = 600): void {
    logFunctionCall("AUDIO_PLAYER", "stopAndFlush", {
      activeSources: this.activeSourceNodes.length,
      suppressDurationMs,
    });

    this.isInterruptedUntil = Date.now() + suppressDurationMs;

    for (const node of this.activeSourceNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Node may have already stopped
      }
    }
    this.activeSourceNodes = [];

    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(false);
      }
    }
  }

  /**
   * Closes and cleans up the AudioContext.
   */
  public close(): void {
    this.stopAndFlush();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  /**
   * Returns whether the player is currently outputting speech.
   */
  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}
