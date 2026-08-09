import React, { useState, useCallback } from 'react';
import GestureCamera from '../components/GestureCamera';
import { SignalForHelpDetector } from '../lib/signalForHelpDetector';
import { Activity, ShieldAlert, CheckCircle2, RefreshCw, Volume2 } from 'lucide-react';

export default function DebugGesturePage() {
  const [detectorStatus, setDetectorStatus] = useState({
    state: SignalForHelpDetector.STATE_IDLE,
    pose: null,
    triggered: false,
    fps: 0,
    timeRemaining: 0
  });

  const [triggerEvents, setTriggerEvents] = useState([]);

  const handleStateChange = useCallback((status) => {
    setDetectorStatus(status);
  }, []);

  const handleTrigger = useCallback((event) => {
    setTriggerEvents((prev) => [event, ...prev]);

    // Optional audio beep feedback for debug verification
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }, []);

  const stateColors = {
    [SignalForHelpDetector.STATE_IDLE]: "bg-slate-800 text-slate-300 border-slate-700",
    [SignalForHelpDetector.STATE_OPEN_PALM]: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    [SignalForHelpDetector.STATE_THUMB_TUCKED]: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    [SignalForHelpDetector.STATE_TRIGGERED]: "bg-rose-600/30 text-rose-200 border-rose-500 animate-pulse font-bold"
  };

  const pose = detectorStatus.pose;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner Alert on Trigger */}
      {detectorStatus.triggered && (
        <div className="p-4 bg-rose-600 text-white rounded-xl shadow-lg border-2 border-rose-400 flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-8 h-8 text-yellow-300" />
            <div>
              <h2 className="text-xl font-bold">DISTRESS SIGNAL DETECTED!</h2>
              <p className="text-sm text-rose-100">Step 3/3 complete: 4 fingers closed over tucked thumb</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-black/30 rounded-lg text-xs font-mono">STATE: TRIGGERED</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            <span>Signal for Help Detector — Live Debug Suite</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Perform sequence: <strong className="text-amber-300">1. Open Palm</strong> &rarr; <strong className="text-indigo-300">2. Tuck Thumb</strong> &rarr; <strong className="text-rose-400">3. Fold 4 Fingers Over Thumb</strong> (within 3 seconds).
          </p>
        </div>

        <div className="flex items-center space-x-3 text-sm">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
            FPS: <span className="text-emerald-400 font-bold">{detectorStatus.fps}</span>
          </div>
          {detectorStatus.timeRemaining > 0 && (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 font-mono">
              Timer: {detectorStatus.timeRemaining.toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Col: Live Video Feed & Canvas Overlay */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative">
            <GestureCamera
              showDebugOverlay={true}
              onStateChange={handleStateChange}
              onTrigger={handleTrigger}
              className="w-full h-full"
            />
          </div>

          {/* Current State Indicator Box */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${stateColors[detectorStatus.state]}`}>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider opacity-75 font-semibold">Current State Machine State</div>
              <div className="text-lg font-mono font-bold">{detectorStatus.state}</div>
            </div>
            <div className="text-right">
              {detectorStatus.state === SignalForHelpDetector.STATE_IDLE && <span className="text-xs text-slate-400">Waiting for Open Palm...</span>}
              {detectorStatus.state === SignalForHelpDetector.STATE_OPEN_PALM && <span className="text-xs text-amber-300">Step 1/3 Done — Tuck thumb now</span>}
              {detectorStatus.state === SignalForHelpDetector.STATE_THUMB_TUCKED && <span className="text-xs text-indigo-300">Step 2/3 Done — Fold fingers over thumb now</span>}
              {detectorStatus.state === SignalForHelpDetector.STATE_TRIGGERED && <span className="text-xs text-rose-200 font-bold">Step 3/3 COMPLETE</span>}
            </div>
          </div>
        </div>

        {/* Right Col: Geometric Pose Telemetry & Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              Real-time Geometric Pose Telemetry
            </h3>

            {pose ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400">4 Fingers Extended (&ge;3):</span>
                  <span className={`font-mono font-semibold ${pose.fourFingersExtended ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {pose.fourFingersExtended ? `YES (${pose.extendedCount}/4)` : `NO (${pose.extendedCount}/4)`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400">4 Fingers Curled (&ge;3):</span>
                  <span className={`font-mono font-semibold ${pose.fourFingersCurled ? 'text-rose-400' : 'text-slate-500'}`}>
                    {pose.fourFingersCurled ? `YES (${pose.curledCount}/4)` : `NO (${pose.curledCount}/4)`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Thumb Tucked (&lt;0.60 / &lt;0.40):</span>
                  <span className={`font-mono font-semibold ${pose.thumbIsTucked ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {pose.thumbIsTucked ? 'TRUE' : 'FALSE'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Thumb Extended (&gt;0.70):</span>
                  <span className={`font-mono font-semibold ${pose.thumbIsExtended ? 'text-amber-400' : 'text-slate-500'}`}>
                    {pose.thumbIsExtended ? 'TRUE' : 'FALSE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 pt-1">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <div>Thumb &rarr; Pinky MCP:</div>
                    <div className="text-slate-200 font-bold mt-0.5">{pose.thumbPinkyDist?.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <div>Thumb &rarr; Middle MCP:</div>
                    <div className="text-slate-200 font-bold mt-0.5">{pose.thumbMiddleDist?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hand detected in webcam view
              </div>
            )}
          </div>

          {/* Event Trigger Log */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Trigger History Log ({triggerEvents.length})
              </h3>
              {triggerEvents.length > 0 && (
                <button
                  onClick={() => setTriggerEvents([])}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs">
              {triggerEvents.length === 0 ? (
                <div className="text-slate-500 italic py-2">No triggers recorded yet. Perform full gesture sequence to test.</div>
              ) : (
                triggerEvents.map((evt, idx) => (
                  <div key={idx} className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded flex items-center justify-between">
                    <span>{evt.gesture}</span>
                    <span className="text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
