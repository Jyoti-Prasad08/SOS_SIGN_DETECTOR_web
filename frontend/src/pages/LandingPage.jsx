import React from 'react';
import { Shield, ArrowRight, EyeOff, Lock, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider">
          <Shield className="w-4 h-4 text-rose-500" />
          <span>Silent Computer Vision Emergency Dispatch</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent max-w-3xl mx-auto leading-tight">
          SOS Sign Emergency Protection System
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          People experiencing domestic violence, coercive control, or harassment often cannot safely speak or call emergency services. <strong className="text-slate-200">SOS Sign</strong> silently recognizes the internationally recognized "Signal for Help" gesture via webcam and dispatches an emergency alert.
        </p>

        {/* Primary CTA Button */}
        <div className="pt-4 flex justify-center">
          <Link
            to="/protect"
            className="px-8 py-4 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl shadow-xl shadow-rose-950/50 hover:shadow-rose-900/60 transition-all transform hover:-translate-y-0.5 flex items-center space-x-3 group cursor-pointer"
          >
            <EyeOff className="w-6 h-6 text-rose-200" />
            <span>Start Protection Mode</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Disguised UI Cover</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Runs embedded inside an innocent video call interface. An abuser or onlooker will only see a standard video call screen.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl w-fit">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">100% Client-Side JS</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Gesture recognition runs entirely in WebAssembly on your browser. Zero video stream data is sent to any server.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Live Broadcast</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            When triggered, an emergency signal with camera snapshot and location coordinates is broadcast live to responders over WebSockets.
          </p>
        </div>
      </div>
    </div>
  );
}
