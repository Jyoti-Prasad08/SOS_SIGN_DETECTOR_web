import React, { useState } from 'react';
import GestureCamera from '../components/GestureCamera';
import { EyeOff, ShieldAlert, CheckCircle } from 'lucide-react';

export default function ProtectPage() {
  const [lastTrigger, setLastTrigger] = useState(null);
  const [detectorStatus, setDetectorStatus] = useState(null);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 text-indigo-400">
        <EyeOff className="w-8 h-8" />
        <h1 className="text-3xl font-bold text-white">Protection Mode (Disguised UI)</h1>
      </div>
      <p className="text-slate-400">
        Client-side gesture recognition is running silently in the background of this page.
      </p>

      {lastTrigger && (
        <div className="p-4 bg-rose-600/20 border border-rose-500 text-rose-300 rounded-xl flex items-center space-x-3 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
          <div>
            <div className="font-bold">SILENT EMERGENCY ALERT TRIGGERED</div>
            <div className="text-xs text-rose-200">Dispatched distress signal at {new Date(lastTrigger.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      {/* Disguised Camera Feed Block */}
      <div className="relative aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
        <GestureCamera
          showDebugOverlay={true}
          onStateChange={(status) => setDetectorStatus(status)}
          onTrigger={(evt) => setLastTrigger(evt)}
          className="w-full h-full"
        />
      </div>

      <div className="text-center text-xs text-slate-500">
        Tip: For full telemetry data and gesture skeleton debugging, click <strong className="text-amber-400 font-semibold">Debug View</strong> in the top navigation bar.
      </div>
    </div>
  );
}
