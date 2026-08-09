import React, { useState, useEffect, useCallback } from 'react';
import GestureCamera from '../components/GestureCamera';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Hand, PhoneOff, 
  ShieldCheck, Lock, Users, AlertTriangle, AlertCircle, Send
} from 'lucide-react';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function ProtectPage() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(412); // seconds (06:52)
  const [hasTriggered, setHasTriggered] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [isDispatchingFallback, setIsDispatchingFallback] = useState(false);
  const [contactsList, setContactsList] = useState([]);

  // Load configured contact names from backend/localStorage
  useEffect(() => {
    async function fetchContacts() {
      try {
        const local = localStorage.getItem('sos_contacts');
        if (local) {
          setContactsList(JSON.parse(local));
          return;
        }
        const res = await fetch(`${BACKEND_URL}/contacts`);
        if (res.ok) {
          const data = await res.json();
          if (data.contacts && data.contacts.length > 0) {
            setContactsList(data.contacts);
            localStorage.setItem('sos_contacts', JSON.stringify(data.contacts));
          }
        }
      } catch (e) {
        // Silent fallback
      }
    }
    fetchContacts();
  }, []);

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
    setHasTriggered(true);
    setTimeout(() => {
      setHasTriggered(false);
    }, 7000);
  }, []);

  // Handle 5-second model/camera load timeout or failure
  const handleLoadTimeout = useCallback(() => {
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
          // ignore
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
        setHasTriggered(true);
        setTimeout(() => setHasTriggered(false), 7000);
      }
    } catch (err) {
      // ignore
    } finally {
      setIsDispatchingFallback(false);
    }
  };

  const contactNamesStr = contactsList.length > 0 
    ? contactsList.map(c => c.name).join(", ") 
    : "Jane Doe, Campus Security";

  return (
    <div className="max-w-6xl mx-auto flex flex-col min-h-[75vh] sm:h-[calc(100vh-6rem)] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {/* Convincing Alert Dispatch Confirmation Toast Animation */}
      {hasTriggered && (
        <div className="absolute top-14 sm:top-16 left-1/2 transform -translate-x-1/2 z-50 w-[92%] max-w-xl px-2 animate-bounce">
          <div className="p-3.5 sm:p-4 bg-slate-900/95 border-2 border-rose-500 text-white rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 bg-rose-600 rounded-xl animate-pulse flex-shrink-0">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-400">Silent Emergency Dispatch</span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                Emergency alert dispatched live to Dashboard!
              </p>
              <p className="text-[11px] sm:text-xs text-emerald-400 font-mono truncate">
                &rarr; Notification sent: <strong className="underline">{contactNamesStr}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Second Fallback Alert Banner */}
      {showFallback && !hasTriggered && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 p-2.5 sm:p-3 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-2 z-30 px-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="text-center sm:text-left">Camera setup delayed? Manual emergency backup active.</span>
          </div>
          <button
            onClick={triggerManualFallback}
            disabled={isDispatchingFallback}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow flex items-center space-x-1 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isDispatchingFallback ? "Dispatching..." : "GET HELP NOW"}</span>
          </button>
        </div>
      )}

      {/* Disguised Video Call Header */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="flex items-center space-x-2 truncate">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full animate-ping flex-shrink-0"></span>
            <h2 className="text-xs sm:text-base font-semibold text-white truncate">Product Engineering Sync</h2>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Encrypted HD</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm font-mono text-slate-300 flex-shrink-0">
          <div className="flex items-center space-x-1 text-slate-400 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>4</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">{formatDuration(callDuration)}</span>
        </div>
      </header>

      {/* Video Grid Container */}
      <main className="flex-1 relative bg-slate-950 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 overflow-hidden min-h-[300px]">
        
        {/* Main Self-View Tile */}
        <div className="md:col-span-8 lg:col-span-9 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[260px] sm:min-h-[360px]">
          
          <GestureCamera
            showDebugOverlay={false}
            onTrigger={handleGestureTrigger}
            onLoadTimeout={handleLoadTimeout}
            className="w-full h-full"
          />

          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg border border-slate-800/80 text-[11px] sm:text-xs font-medium text-slate-200 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>You (Speaking)</span>
          </div>
        </div>

        {/* Secondary Participant Tiles */}
        <div className="hidden md:flex md:col-span-4 lg:col-span-3 flex-col space-y-3">
          <div className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950/40">
            <div className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-lg font-bold text-indigo-300">
              AR
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/80 rounded border border-slate-800 text-[10px] text-slate-300">
              Alex Rivera (Host)
            </div>
          </div>

          <div className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-slate-900 to-teal-950/40">
            <div className="w-14 h-14 rounded-full bg-teal-600/30 border border-teal-500/30 flex items-center justify-center text-lg font-bold text-teal-300">
              SC
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/80 rounded border border-slate-800 text-[10px] text-slate-300">
              Sarah Chen
            </div>
          </div>
        </div>
      </main>

      {/* Disguised Bottom Video Call Control Bar */}
      <footer className="bg-slate-900/90 border-t border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 sm:p-3 rounded-full transition ${
              isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-2.5 sm:p-3 rounded-full transition ${
              isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoOff ? "Start Camera" : "Stop Camera"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            className="p-2.5 sm:p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition hidden sm:block"
            title="Share Screen"
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            className="p-2.5 sm:p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition"
            title="Raise Hand"
          >
            <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </button>

          <button
            onClick={triggerManualFallback}
            disabled={isDispatchingFallback}
            className="p-2.5 sm:px-3 sm:py-2 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-full sm:rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
            title="Manual Emergency Panic Option"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="hidden sm:inline">{isDispatchingFallback ? "Sending..." : "Panic Option"}</span>
          </button>
        </div>

        <div>
          <button
            onClick={() => window.location.href = "/"}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs sm:text-sm rounded-full transition flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-950"
          >
            <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
