import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProtectPage from './pages/ProtectPage';
import ContactsPage from './pages/ContactsPage';
import DashboardPage from './pages/DashboardPage';
import DebugGesturePage from './pages/DebugGesturePage';
import { Shield, EyeOff, Users, Activity } from 'lucide-react';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
        {/* Responsive Navigation Bar */}
        <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
            <NavLink to="/" className="flex items-center space-x-2 font-extrabold text-base sm:text-lg text-white hover:text-rose-400 transition flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
              <span>SOS Sign</span>
            </NavLink>

            <nav className="flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm font-medium">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition flex items-center space-x-1.5 ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span className="hidden xs:inline">Home</span>
              </NavLink>

              <NavLink
                to="/protect"
                className={({ isActive }) =>
                  `px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition flex items-center space-x-1.5 ${
                    isActive ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                <span>Protect Mode</span>
              </NavLink>

              <NavLink
                to="/contacts"
                className={({ isActive }) =>
                  `px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition flex items-center space-x-1.5 ${
                    isActive ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
                <span>Contacts</span>
              </NavLink>

              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition flex items-center space-x-1.5 ${
                    isActive ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span>Dashboard</span>
              </NavLink>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 py-4 sm:py-8 px-2 sm:px-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/protect" element={<ProtectPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Secret troubleshooting route (hidden from navbar) */}
            <Route path="/debug-gesture" element={<DebugGesturePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
