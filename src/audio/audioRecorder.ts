/**
 * @file audioRecorder.ts
 * =============================================================================
 * MICROPHONE CAPTURE & 16kHz PCM AUDIO ENCODER
 * =============================================================================
 * This module manages the browser microphone media stream and downsamples raw
 * audio to 16,000 Hz, 1-channel (mono), 16-bit linear PCM little-endian as
 * required by the Gemini Live API real-time input specification.
 *
 * Use Cases:
 * 1. Requesting user microphone permissions cleanly with fallbacks.
 * 2. Continuously processing incoming Float32 microphone buffers via ScriptProcessor.
 * 3. Downsampling browser sample rates (e.g. 44.1kHz / 48kHz) to exactly 16kHz.
 * 4. Converting raw Int16 PCM samples to base64-encoded strings for WebSocket transmission.
 * 5. Calculating audio volume (RMS) to power live UI waveform visualizations.
 * =============================================================================
 */

import { APP_CONFIG } from "../config/appConfig";
import { logError, logFunctionCall } from "../utils/logger";

export type AudioChunkCallback = (base64PcmChunk: string) => void;
export type VolumeCallback = (volumeLevel: number) => void;
export type UserSpeechCallback = () => void;

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  private onAudioChunk: AudioChunkCallback | null = null;
  private onVolume: VolumeCallback | null = null;
  private onUserSpeechStart: UserSpeechCallback | null = null;
  private speechFramesCount = 0;

  /**
   * Initializes the recorder with chunk, volume level, and speech start listeners.
   *
   * @param onAudioChunk - Callback receiving base64 16kHz PCM audio chunks.
   * @param onVolume - Optional callback receiving volume intensity (0.0 to 1.0).
   * @param onUserSpeechStart - Optional callback triggered immediately when user voice is detected.
   */
  constructor(
    onAudioChunk: AudioChunkCallback,
    onVolume?: VolumeCallback,
    onUserSpeechStart?: UserSpeechCallback
  ) {
    this.onAudioChunk = onAudioChunk;
    this.onVolume = onVolume || null;
    this.onUserSpeechStart = onUserSpeechStart || null;
    logFunctionCall("AUDIO_RECORDER", "constructor", {});
  }

  /**
   * Starts capturing microphone input and converts samples to 16kHz PCM.
   *
   * @returns Promise resolving to boolean indicating whether capture succeeded.
   */
  public async start(): Promise<boolean> {
    logFunctionCall("AUDIO_RECORDER", "start", { isRecording: this.isRecording });
    if (this.isRecording) return true;

    try {
      // Request audio stream with echo cancellation and noise suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create AudioContext (matching native rate, downsampled manually in processor)
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtxClass();

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(
        APP_CONFIG.audio.bufferSize,
        1,
        1
      );

      const targetSampleRate = APP_CONFIG.audio.inputSampleRate;
      const inputSampleRate = this.audioContext.sampleRate;

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isRecording) return;
        const inputData = event.inputBuffer.getChannelData(0);

        // Compute volume RMS
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        const normalizedVol = Math.min(1, rms * 5); // amplify visual response

        if (this.onVolume) {
          this.onVolume(normalizedVol);
        }

        // Real-time Voice Activity Detection (VAD) for instant barge-in interruption
        if (normalizedVol >= APP_CONFIG.audio.bargeInVolumeThreshold) {
          this.speechFramesCount++;
          if (
            this.speechFramesCount >= APP_CONFIG.audio.bargeInConsecutiveFrames &&
            this.onUserSpeechStart
          ) {
            this.onUserSpeechStart();
          }
        } else {
          this.speechFramesCount = 0;
        }

        // Downsample input float buffer to 16kHz
        const downsampled = this.downsampleBuffer(
          inputData,
          inputSampleRate,
          targetSampleRate
        );

        // Convert Float32 to 16-bit Linear PCM
        const pcm16 = this.floatTo16BitPCM(downsampled);

        // Convert to base64
        const base64Chunk = this.arrayBufferToBase64(pcm16.buffer);

        if (this.onAudioChunk) {
          this.onAudioChunk(base64Chunk);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      return true;
    } catch (error) {
      logError("AUDIO_RECORDER", "start", error);
      this.stop();
      return false;
    }
  }

  /**
   * Stops microphone capture and cleans up media tracks and Web Audio nodes.
   */
  public stop(): void {
    logFunctionCall("AUDIO_RECORDER", "stop", { isRecording: this.isRecording });
    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.onVolume) {
      this.onVolume(0);
    }
  }

  /**
   * Resamples an input Float32 audio buffer from the hardware sample rate
   * to the target 16,000 Hz rate.
   *
   * @param buffer - Raw input Float32 array.
   * @param inputRate - Hardware sample rate (e.g. 48,000 Hz).
   * @param targetRate - Target rate (16,000 Hz).
   * @returns Resampled Float32 array.
   */
  private downsampleBuffer(
    buffer: Float32Array,
    inputRate: number,
    targetRate: number
  ): Float32Array {
    if (inputRate === targetRate) {
      return buffer;
    }
    const ratio = inputRate / targetRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originalIndex = Math.min(Math.floor(i * ratio), buffer.length - 1);
      result[i] = buffer[originalIndex];
    }
    return result;
  }

  /**
   * Converts Float32 audio samples (-1.0 to 1.0) into 16-bit signed integer PCM.
   *
   * @param floatSamples - Input Float32 array.
   * @returns Int16Array containing PCM data.
   */
  private floatTo16BitPCM(floatSamples: Float32Array): Int16Array {
    const pcm = new Int16Array(floatSamples.length);
    for (let i = 0; i < floatSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }

  /**
   * Converts an ArrayBuffer to a standard base64 string.
   *
   * @param buffer - Source ArrayBuffer.
   * @returns Base64 encoded string.
   */
  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Returns current recording state.
   */
  public isActive(): boolean {
    return this.isRecording;
  }
}
