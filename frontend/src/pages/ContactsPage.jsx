import React from 'react';
import { UserPlus, ShieldAlert } from 'lucide-react';

export default function ContactsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 text-teal-400">
        <UserPlus className="w-8 h-8" />
        <h1 className="text-3xl font-bold text-white">Trusted Contacts</h1>
      </div>
      <p className="text-slate-400">
        Placeholder for managing trusted contact details, notification preferences, and emergency dispatch rules.
      </p>

      <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-400">
          <ShieldAlert className="w-5 h-5" />
          <h3 className="font-semibold">Demo Setup</h3>
        </div>
        <p className="text-sm text-slate-400">
          Plain name field and emergency contacts setup will be configured here for the demo flow.
        </p>
      </div>
    </div>
  );
}
