import React from 'react';
import { Radio, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 text-rose-500">
        <Radio className="w-8 h-8 animate-pulse" />
        <h1 className="text-3xl font-bold text-white">Responder Dashboard</h1>
      </div>
      <p className="text-slate-400">
        Placeholder for live emergency alerts broadcasted via WebSocket from the backend service.
      </p>

      <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center space-x-3 text-slate-400">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-white">Live Monitoring Status: Ready</h3>
        </div>
        <p className="text-sm text-slate-400">
          WebSocket connection will stream incoming distress triggers in real-time.
        </p>
      </div>
    </div>
  );
}
