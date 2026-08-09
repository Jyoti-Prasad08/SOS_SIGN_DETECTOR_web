import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { SignalForHelpDetector } from '../lib/signalForHelpDetector';
import { Camera, AlertCircle } from 'lucide-react';

const BACKEND_URL = "http://127.0.0.1:8000";

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
  onLoadTimeout,
  showDebugOverlay = false,
  userName = "Anonymous User",
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

  // 5-second load timeout check for safety fallback
  useEffect(() => {
    const timeoutTimer = setTimeout(() => {
      if (isLoadingModel || !isCameraActive) {
        console.warn("[GestureCamera] 5s timeout reached before camera/model ready. Triggering fallback callback.");
        if (onLoadTimeout) {
          onLoadTimeout();
        }
      }
    }, 5000);

    return () => clearTimeout(timeoutTimer);
  }, [isLoadingModel, isCameraActive, onLoadTimeout]);

  // Helper to capture current frame snapshot as Base64 JPEG
  const captureSnapshotBase64 = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (e) {
      console.warn("Snapshot capture error:", e);
    }
    return null;
  }, []);

  // Helper to dispatch alert payload to backend
  const dispatchEmergencyAlert = useCallback(async (snapshotBase64) => {
    let lat = null;
    let lng = null;

    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { timeout: 3000 }
          );
        });
        if (position) {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } catch (e) {
        console.warn("Geolocation fetch failed or timed out:", e);
      }
    }

    const payload = {
      name: localStorage.getItem('sos_user_name') || userName || "Anonymous User",
      latitude: lat,
      longitude: lng,
      snapshot_base64: snapshotBase64,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(`${BACKEND_URL}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      console.log("[ALERT DISPATCHED TO BACKEND]", data);
      return data;
    } catch (err) {
      console.error("Failed to post emergency alert to backend:", err);
      return null;
    }
  }, [userName]);

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
          if (onLoadTimeout) onLoadTimeout();
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
  }, [onLoadTimeout]);

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
      setError("Camera access denied or device unavailable.");
      setIsCameraActive(false);
      if (onLoadTimeout) onLoadTimeout();
    }
  }, [onLoadTimeout]);

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

      // Trigger Handler: Capture snapshot & dispatch to POST /alert
      if (isTriggered && !wasTriggeredRef.current) {
        const snapshot = captureSnapshotBase64();
        dispatchEmergencyAlert(snapshot);

        if (onTrigger) {
          onTrigger({
            timestamp: new Date().toISOString(),
            gesture: "Signal for Help",
            snapshot_base64: snapshot
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
  }, [onStateChange, onTrigger, showDebugOverlay, captureSnapshotBase64, dispatchEmergencyAlert]);

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
    <div className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${className}`}>
      {/* Loading Overlay (only shown if debug or camera not active) */}
      {isLoadingModel && showDebugOverlay && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-slate-300 space-y-3 p-4 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading MediaPipe Gesture Model...</span>
        </div>
      )}

      {/* Manual Start Camera Button if permission needed in Debug Overlay */}
      {!isLoadingModel && !isCameraActive && showDebugOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center space-y-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full">
            <Camera className="w-8 h-8" />
          </div>
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition shadow-lg flex items-center space-x-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Enable Camera Access</span>
          </button>
        </div>
      )}

      {/* Video Element — Always visible as video feed preview */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100 block"
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
