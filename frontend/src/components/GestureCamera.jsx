import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { SignalForHelpDetector } from '../lib/signalForHelpDetector';
import { Camera, AlertCircle } from 'lucide-react';

// Hand landmark connection pairs for overlay rendering
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
];

export default function GestureCamera({
  onStateChange,
  onTrigger,
  showDebugOverlay = false,
  className = ""
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const landmarkerRef = useRef(null);
  const detectorRef = useRef(new SignalForHelpDetector(3.0));
  const wasTriggeredRef = useRef(false);

  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [detectorStatus, setDetectorStatus] = useState({
    state: SignalForHelpDetector.STATE_IDLE,
    pose: null,
    triggered: false,
    fps: 0,
    timeRemaining: 0
  });

  const fpsFrameCounterRef = useRef(0);
  const lastFpsCalcTimeRef = useRef(performance.now());
  const currentFpsRef = useRef(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let isSubscribed = true;

    async function initLandmarker() {
      try {
        setIsLoadingModel(true);
        setError(null);

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (!isSubscribed) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6
        });

        if (!isSubscribed) return;

        landmarkerRef.current = landmarker;
        setIsLoadingModel(false);
      } catch (err) {
        console.error("Failed to initialize MediaPipe HandLandmarker:", err);
        if (isSubscribed) {
          setError("Failed to load gesture recognition model.");
          setIsLoadingModel(false);
        }
      }
    }

    initLandmarker();

    return () => {
      isSubscribed = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Function to explicitly start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Webcam access error:", err);
      setError("Camera access denied or device unavailable. Please allow camera access in browser permissions.");
      setIsCameraActive(false);
    }
  }, []);

  // Auto-start camera when model finishes loading
  useEffect(() => {
    if (!isLoadingModel && !isCameraActive && !error) {
      startCamera();
    }
  }, [isLoadingModel, isCameraActive, error, startCamera]);

  // Frame Processing Loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const detector = detectorRef.current;

    if (video && video.readyState >= 2 && landmarker) {
      const now = performance.now();
      
      // Calculate FPS
      fpsFrameCounterRef.current += 1;
      if (now - lastFpsCalcTimeRef.current >= 1000) {
        currentFpsRef.current = Math.round((fpsFrameCounterRef.current * 1000) / (now - lastFpsCalcTimeRef.current));
        fpsFrameCounterRef.current = 0;
        lastFpsCalcTimeRef.current = now;
      }

      // Run MediaPipe Detection
      let landmarks = null;
      try {
        const results = landmarker.detectForVideo(video, now);
        if (results && results.landmarks && results.landmarks.length > 0) {
          landmarks = results.landmarks[0];
        }
      } catch (e) {
        console.warn("HandLandmarker detect error:", e);
      }

      // Update gesture state machine
      const updateResult = detector.update(landmarks);
      const isTriggered = detector.isTriggered();

      // Trigger Callback
      if (isTriggered && !wasTriggeredRef.current) {
        if (onTrigger) {
          onTrigger({
            timestamp: new Date().toISOString(),
            gesture: "Signal for Help"
          });
        }
      }
      wasTriggeredRef.current = isTriggered;

      // Update Local State & Outer Callbacks
      const statusObj = {
        state: updateResult.state,
        pose: updateResult.pose,
        triggered: isTriggered,
        fps: currentFpsRef.current,
        timeRemaining: updateResult.timeRemaining
      };
      setDetectorStatus(statusObj);

      if (onStateChange) {
        onStateChange(statusObj);
      }

      // Draw Debug Skeleton & Visual Overlay if requested
      if (showDebugOverlay && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (landmarks) {
            // Draw Hand Connections
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 3;
            HAND_CONNECTIONS.forEach(([i, j]) => {
              const p1 = landmarks[i];
              const p2 = landmarks[j];
              if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                ctx.stroke();
              }
            });

            // Draw Landmark Points
            landmarks.forEach((lm, idx) => {
              ctx.beginPath();
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20 ? 6 : 4, 0, 2 * Math.PI);
              ctx.fillStyle = idx === 4 ? '#ff3366' : '#00ffff';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
            });
          }
        }
      }
    }

    animFrameId.current = requestAnimationFrame(processFrame);
  }, [onStateChange, onTrigger, showDebugOverlay]);

  useEffect(() => {
    if (isCameraActive && !isLoadingModel) {
      animFrameId.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isCameraActive, isLoadingModel, processFrame]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center ${className}`}>
      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-slate-300 space-y-3 p-4 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading MediaPipe Gesture Model...</span>
        </div>
      )}

      {/* Manual Start Camera / Permission Button Overlay */}
      {!isLoadingModel && !isCameraActive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center space-y-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full">
            <Camera className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-white">Camera Access Required</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Gesture detection runs 100% locally in your browser. No video is uploaded to any server.
            </p>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 max-w-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Enable Camera Access</span>
          </button>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 ${showDebugOverlay ? 'block' : 'opacity-0 pointer-events-none absolute'}`}
      />

      {/* Debug Canvas Overlay */}
      {showDebugOverlay && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100"
        />
      )}
    </div>
  );
}
