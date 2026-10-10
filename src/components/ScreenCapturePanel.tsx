/**
 * @file ScreenCapturePanel.tsx
 * =============================================================================
 * MULTIMODAL SCREEN INGESTION & VISUAL FEED CONTROLLER
 * =============================================================================
 * This component manages the real-time visual feeds consumed by Gemini Live.
 *
 * Supported Visual Modalities:
 * 1. Built-in Sandbox: Direct programmatic capture of the Coinbase Simulator.
 * 2. Live Screen Share: Captures desktop windows or browser tabs via `getDisplayMedia`.
 * 3. Screenshot Upload: Allows uploading existing PNG/JPEG screenshots.
 * 4. Webcam Stream: Allows pointing a device camera at an external monitor.
 *
 * Use Cases:
 * 1. Encodes visible frames to JPEG base64 at 1 FPS to feed `session.sendRealtimeInput({ video })`.
 * 2. Renders an interactive view of what the agent currently "sees".
 * 3. Shows target bounding reticles and detected fee highlights on the visual feed.
 * =============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Monitor,
  Upload,
  Camera,
  PlaySquare,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { CoinbaseSimulator } from "./CoinbaseSimulator";
import { ScreenSourceType } from "../types/guide";
import { logFunctionCall, logError } from "../utils/logger";

interface ScreenCapturePanelProps {
  onFrameAvailable: (base64Jpeg: string) => void;
  onRequestManualAnalysis: (base64Jpeg: string) => void;
  isAnalyzing: boolean;
}

/**
 * ScreenCapturePanel component managing multimodal inputs.
 *
 * @param props - ScreenCapturePanelProps
 * @returns React.JSX.Element
 */
export function ScreenCapturePanel({
  onFrameAvailable,
  onRequestManualAnalysis,
  isAnalyzing,
}: ScreenCapturePanelProps): React.JSX.Element {
  const [sourceType, setSourceType] = useState<ScreenSourceType>("simulator");
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  logFunctionCall("SCREEN_CAPTURE_PANEL", "render", { sourceType, isScreenSharing });

  /**
   * Captures the current frame from video stream onto canvas and yields base64 JPEG.
   */
  const captureVideoFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = Math.min(video.videoWidth || 800, 1024);
    canvas.height = Math.min(video.videoHeight || 600, 768);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    return base64;
  };

  /**
   * Starts desktop/tab screen sharing using standard browser WebRTC APIs.
   */
  const startScreenShare = async () => {
    logFunctionCall("SCREEN_CAPTURE_PANEL", "startScreenShare", {});
    setStreamError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScreenSharing(true);
      setSourceType("screenshare");

      // Handle stream end by user
      stream.getVideoTracks()[0].onended = () => {
        stopMediaStream();
      };
    } catch (err: any) {
      logError("SCREEN_CAPTURE_PANEL", "startScreenShare", err);
      setStreamError("Screen sharing permission cancelled or unavailable.");
    }
  };

  /**
   * Starts device camera capture.
   */
  const startCameraStream = async () => {
    logFunctionCall("SCREEN_CAPTURE_PANEL", "startCameraStream", {});
    setStreamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScreenSharing(true);
      setSourceType("camera");
    } catch (err: any) {
      logError("SCREEN_CAPTURE_PANEL", "startCameraStream", err);
      setStreamError("Camera permission cancelled or unavailable.");
    }
  };

  /**
   * Stops active video track.
   */
  const stopMediaStream = () => {
    logFunctionCall("SCREEN_CAPTURE_PANEL", "stopMediaStream", {});
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
  };

  /**
   * Handles user uploaded screenshot.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    logFunctionCall("SCREEN_CAPTURE_PANEL", "handleFileUpload", {
      name: file.name,
      size: file.size,
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setActiveFrameUrl(dataUrl);
        setSourceType("upload");
        onFrameAvailable(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Receives captured simulator image and updates state.
   */
  const handleSimulatorFrame = (dataUrl: string) => {
    setActiveFrameUrl(dataUrl);
    onFrameAvailable(dataUrl);
  };

  // Continuous frame push interval for video/screenshare
  useEffect(() => {
    if ((sourceType === "screenshare" || sourceType === "camera") && isScreenSharing) {
      const timer = setInterval(() => {
        const frame = captureVideoFrame();
        if (frame) {
          setActiveFrameUrl(frame);
          onFrameAvailable(frame);
        }
      }, 1000); // 1 FPS push
      return () => clearInterval(timer);
    }
  }, [sourceType, isScreenSharing]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
      {/* Tab selection for visual input source */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            Screen Source Ingestion
          </h3>
        </div>

        {/* Source switch pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => {
              stopMediaStream();
              setSourceType("simulator");
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              sourceType === "simulator"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Coinbase Sandbox
          </button>

          <button
            onClick={startScreenShare}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              sourceType === "screenshare"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Screen Share
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              sourceType === "upload"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Upload Image
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {streamError && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{streamError}</span>
        </div>
      )}

      {/* Main visual display container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: The Active Visual Target */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {sourceType === "simulator" && (
            <CoinbaseSimulator onCaptureScreen={handleSimulatorFrame} />
          )}

          {(sourceType === "screenshare" || sourceType === "camera") && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-700 text-[10px] text-cyan-300 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Live Multimodal Feed (1 FPS)</span>
              </div>
            </div>
          )}

          {sourceType === "upload" && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[380px] flex items-center justify-center p-2">
              {activeFrameUrl ? (
                <img
                  src={activeFrameUrl}
                  alt="Uploaded Screen"
                  className="max-h-[460px] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No screenshot selected yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Agent's Visual Perception & Manual Trigger */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Agent Vision Pipeline
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  Multimodal Active
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini receives screen frames in real time. It parses English text, detects
                interactive buttons, and identifies fees & risk warnings.
              </p>
            </div>

            {/* Quick action: Inspect Screen Now */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                disabled={isAnalyzing}
                onClick={() => {
                  logFunctionCall("SCREEN_CAPTURE_PANEL", "clickInspectNow", {});
                  // If simulator, trigger capture first
                  if (sourceType === "simulator") {
                    window.dispatchEvent(new CustomEvent("request-screen-capture"));
                  }
                  setTimeout(() => {
                    if (activeFrameUrl) {
                      onRequestManualAnalysis(activeFrameUrl);
                    }
                  }, 100);
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isAnalyzing
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 active:scale-[0.99]"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Screen Elements...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Inspect & Guide Screen Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Guidelines on Screen Clarity */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <span className="font-semibold text-slate-300 block text-[11px]">
              Vision Guidelines
            </span>
            <p className="text-[11px] leading-relaxed">
              • The agent reads English text from buttons like "Preview Buy" or "Buy now".
            </p>
            <p className="text-[11px] leading-relaxed">
              • Ensure amount fields and fee breakdowns are unoccluded.
            </p>
            <p className="text-[11px] leading-relaxed">
              • If image is blurry, the agent will politely ask you to adjust it.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
