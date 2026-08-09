import React, { useState, useEffect, useCallback } from 'react';
import GestureCamera from '../components/GestureCamera';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Hand, PhoneOff, 
  ShieldCheck, Lock, Users, AlertTriangle, AlertCircle, CheckCircle 
} from 'lucide-react';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function ProtectPage() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(412); // seconds (06:52)
  const [hasTriggered, setHasTriggered] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [isDispatchingFallback, setIsDispatchingFallback] = useState(false);
  const [fallbackSuccess, setFallbackSuccess] = useState(false);

  // Fake call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle silent gesture trigger from GestureCamera
  const handleGestureTrigger = useCallback((event) => {
    console.log("[PROTECT MODE] Silent Emergency Gesture Triggered!", event);
    setHasTriggered(true);
  }, []);

  // Handle 5-second model/camera load timeout or failure
  const handleLoadTimeout = useCallback(() => {
    console.warn("[PROTECT MODE] Gesture detector fallback activated after load delay.");
    setShowFallback(true);
  }, []);

  // Manual Fallback: "Get Help Now" emergency POST
  const triggerManualFallback = async () => {
    try {
      setIsDispatchingFallback(true);

      let lat = null;
      let lng = null;

      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve(p),
              () => resolve(null),
              { timeout: 3000 }
            );
          });
          if (pos) {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }
        } catch (e) {
          console.warn("Geolocation fetch error:", e);
        }
      }

      const payload = {
        name: localStorage.getItem('sos_user_name') || "Anonymous User",
        latitude: lat,
        longitude: lng,
        snapshot_base64: null,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(`${BACKEND_URL}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFallbackSuccess(true);
        setHasTriggered(true);
      }
    } catch (err) {
      console.error("Manual fallback alert error:", err);
    } finally {
      setIsDispatchingFallback(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-6rem)] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {/* 5-Second Fallback Alert Banner (If camera/model takes too long or fails) */}
      {showFallback && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 p-3 text-amber-200 text-xs sm:text-sm flex items-center justify-between z-30 px-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>Camera setup delayed or restricted? Manual emergency backup is active.</span>
          </div>
          <button
            onClick={triggerManualFallback}
            disabled={isDispatchingFallback}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow flex items-center space-x-1 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{isDispatchingFallback ? "Dispatching..." : "GET HELP NOW"}</span>
          </button>
        </div>
      )}

      {/* Disguised Video Call Header */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <h2 className="text-sm sm:text-base font-semibold text-white">Product Engineering Sync</h2>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-md">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Encrypted HD</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs sm:text-sm font-mono text-slate-300">
          <div className="flex items-center space-x-1 text-slate-400">
            <Users className="w-4 h-4 text-slate-500" />
            <span>4 Participants</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">{formatDuration(callDuration)}</span>
        </div>
      </header>

      {/* Video Grid Container */}
      <main className="flex-1 relative bg-slate-950 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
        
        {/* Main Self-View Tile (Runs GestureCamera silently underneath) */}
        <div className="md:col-span-8 lg:col-span-9 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center group">
          
          {/* Silent Gesture Detection Camera */}
          <GestureCamera
            showDebugOverlay={false}
            onTrigger={handleGestureTrigger}
            onLoadTimeout={handleLoadTimeout}
            className="w-full h-full"
          />

          {/* Video Tile Name Tag Overlay */}
          <div className="absolute bottom-3 left-3 z-10 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg border border-slate-800/80 text-xs font-medium text-slate-200 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>You (Speaking)</span>
          </div>
        </div>

        {/* Secondary Participant Tiles (Realistic Video Call Grid) */}
        <div className="hidden md:flex md:col-span-4 lg:col-span-3 flex-col space-y-3">
          
          {/* Participant 1: Alex */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950/40">
            <div className="w-16 h-16 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-300">
              AR
            </div>
            <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-slate-950/80 rounded border border-slate-800 text-[11px] text-slate-300">
              Alex Rivera (Host)
            </div>
          </div>

          {/* Participant 2: Sarah */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-slate-900 to-teal-950/40">
            <div className="w-16 h-16 rounded-full bg-teal-600/30 border border-teal-500/30 flex items-center justify-center text-xl font-bold text-teal-300">
              SC
            </div>
            <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-slate-950/80 rounded border border-slate-800 text-[11px] text-slate-300">
              Sarah Chen
            </div>
          </div>
        </div>
      </main>

      {/* Fallback "Get Help Now" Emergency Button Overlay (Always visible for safety) */}
      <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <div className="text-slate-500 text-[11px]">
          Video Call Controls Active
        </div>

        <button
          onClick={triggerManualFallback}
          disabled={isDispatchingFallback}
          className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>{isDispatchingFallback ? "Sending..." : "Manual Panic Option (Get Help)"}</span>
        </button>
      </div>

      {/* Disguised Bottom Video Call Control Bar */}
      <footer className="bg-slate-900/90 border-t border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          {/* Mute Mic */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full transition ${
              isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Stop Video */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full transition ${
              isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoOff ? "Start Camera" : "Stop Camera"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        </div>

        {/* Center Actions */}
        <div className="flex items-center space-x-2">
          <button
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition hidden sm:block"
            title="Share Screen"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition hidden sm:block"
            title="In-call Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition"
            title="Raise Hand"
          >
            <Hand className="w-5 h-5 text-amber-400" />
          </button>
        </div>

        {/* End Call Button */}
        <div>
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs sm:text-sm rounded-full transition flex items-center space-x-2 cursor-pointer shadow-lg shadow-rose-950"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave Meeting</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
