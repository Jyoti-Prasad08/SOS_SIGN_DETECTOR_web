import React from 'react';
import { Shield, Lock, Users, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
      <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400 mb-2">
        <Shield className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
        SOS Sign Emergency System
      </h1>
      <p className="text-slate-400 text-lg max-w-xl mx-auto">
        Silent computer-vision gesture detection to safeguard individuals in distress.
      </p>

      <div className="grid md:grid-cols-3 gap-4 pt-6">
        <Link
          to="/protect"
          className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col items-center text-center group"
        >
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:scale-110 transition">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mt-4 text-white">Protection Mode</h3>
          <p className="text-sm text-slate-400 mt-2">Disguised interface with background gesture detection.</p>
        </Link>

        <Link
          to="/contacts"
          className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col items-center text-center group"
        >
          <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 group-hover:scale-110 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mt-4 text-white">Trusted Contacts</h3>
          <p className="text-sm text-slate-400 mt-2">Configure emergency notification recipients.</p>
        </Link>

        <Link
          to="/dashboard"
          className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col items-center text-center group"
        >
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400 group-hover:scale-110 transition">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mt-4 text-white">Responder Dashboard</h3>
          <p className="text-sm text-slate-400 mt-2">Live monitoring dashboard for distress triggers.</p>
        </Link>
      </div>
    </div>
  );
}
