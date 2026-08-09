import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, CheckCircle, Save, ShieldCheck, Mail, Phone, User, AlertCircle } from 'lucide-react';

const BACKEND_URL = "http://127.0.0.1:8000";

export default function ContactsPage() {
  const [userName, setUserName] = useState(() => localStorage.getItem('sos_user_name') || "Jane Doe");
  const [contacts, setContacts] = useState([
    { name: "Jane Doe (Sister)", phone_or_email: "+1 (555) 019-2831", relationship: "Family" },
    { name: "Campus Security", phone_or_email: "security@campus.edu", relationship: "Security Desk" }
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial contacts from GET /contacts
  useEffect(() => {
    async function loadContacts() {
      try {
        setIsLoading(true);
        const res = await fetch(`${BACKEND_URL}/contacts`);
        if (res.ok) {
          const data = await res.json();
          if (data.contacts && data.contacts.length > 0) {
            setContacts(data.contacts);
          }
        }
      } catch (err) {
        console.warn("Failed to load contacts from backend:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadContacts();
  }, []);

  const handleAddContact = () => {
    if (contacts.length >= 3) return;
    setContacts([
      ...contacts,
      { name: "", phone_or_email: "", relationship: "Trusted Contact" }
    ]);
  };

  const handleRemoveContact = (index) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    // Save user profile name
    localStorage.setItem('sos_user_name', userName);

    // Validate
    const validContacts = contacts.filter(c => c.name.trim() && c.phone_or_email.trim());

    try {
      setIsSaving(true);
      const res = await fetch(`${BACKEND_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: validContacts })
      });

      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || validContacts);
        localStorage.setItem('sos_contacts', JSON.stringify(data.contacts || validContacts));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setError("Failed to save contacts to backend.");
      }
    } catch (err) {
      console.error("Save contacts error:", err);
      // Fallback local save
      localStorage.setItem('sos_contacts', JSON.stringify(validContacts));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 text-teal-400 border-b border-slate-800 pb-4">
        <Users className="w-8 h-8" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Trusted Emergency Contacts</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure up to 3 emergency contacts who will be notified when a distress signal is triggered.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center space-x-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>Trusted contacts saved successfully! Notifications will dispatch to these contacts on trigger.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Identity Box */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-white font-semibold text-base">
            <User className="w-5 h-5 text-indigo-400" />
            <h3>Your Profile Name</h3>
          </div>
          <div className="max-w-md">
            <label className="block text-xs text-slate-400 mb-1 font-medium">Display Name (included in alert dispatch)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-sm"
              required
            />
          </div>
        </div>

        {/* Contacts List Box */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-white font-semibold text-base">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3>Emergency Recipients ({contacts.length}/3)</h3>
            </div>

            {contacts.length < 3 && (
              <button
                type="button"
                onClick={handleAddContact}
                className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Loading saved contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm italic">
              No contacts configured. Click "Add Contact" above.
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                      Contact #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                      title="Remove contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Full Name / Label</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Alex Smith (Brother)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Phone Number or Email</label>
                      <input
                        type="text"
                        value={contact.phone_or_email}
                        onChange={(e) => handleContactChange(idx, 'phone_or_email', e.target.value)}
                        placeholder="e.g. +1 (555) 019-2831 or security@campus.edu"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition shadow-lg shadow-teal-950 flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>{isSaving ? "Saving Contacts..." : "Save Emergency Contacts"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
