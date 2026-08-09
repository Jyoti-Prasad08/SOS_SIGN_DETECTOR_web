import React, { useEffect, useState, useRef } from 'react';
import { Radio, AlertTriangle, CheckCircle, MapPin, Clock, User, Camera, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom Leaflet Emergency Marker Icon
const emergencyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const BACKEND_HTTP = "http://127.0.0.1:8000";
const BACKEND_WS = "ws://127.0.0.1:8000/ws/dashboard";

export default function DashboardPage() {
  const [alerts, setAlerts] = useState([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [filter, setFilter] = useState("all"); // "all", "active", "resolved"

  const wsRef = useRef(null);

  // 1. Fetch initial alert history from GET /alerts
  const fetchAlertHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`${BACKEND_HTTP}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch alert history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchAlertHistory();

    // 2. Connect to WebSocket /ws/dashboard
    function connectWebSocket() {
      try {
        const ws = new WebSocket(BACKEND_WS);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WS Connected to Emergency Stream]");
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "NEW_ALERT" && payload.data) {
              setAlerts((prev) => [payload.data, ...prev]);

              // Play alert chime
              try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
                osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
                gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);
              } catch (e) {
                console.warn("Chime playback error:", e);
              }
            }
          } catch (e) {
            console.warn("WebSocket payload parse error:", e);
          }
        };

        ws.onclose = () => {
          console.warn("[WS Disconnected] Reconnecting in 3s...");
          setWsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.error("WebSocket error:", err);
          ws.close();
        };
      } catch (e) {
        console.error("WebSocket initialization failed:", e);
      }
    }

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleAcknowledge = (alertId) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  };

  const filteredAlerts = alerts.filter((alert) => {
    const isResolved = acknowledgedIds.has(alert.id);
    if (filter === "active") return !isResolved;
    if (filter === "resolved") return isResolved;
    return true;
  });

  const activeCount = alerts.filter((a) => !acknowledgedIds.has(a.id)).length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-3">
            <Radio className="w-8 h-8 text-rose-500 animate-pulse" />
            <span>Responder Live Monitoring Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time emergency distress stream broadcasted over WebSockets.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-2 border ${
            wsConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 animate-pulse" />}
            <span>{wsConnected ? "LIVE STREAM ACTIVE" : "DISCONNECTED"}</span>
          </div>

          <button
            onClick={fetchAlertHistory}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition"
            title="Refresh Alert History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Summary stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center space-x-1.5 ${
              filter === "active" ? "bg-rose-600/20 text-rose-300 border border-rose-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Active ({activeCount})</span>
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              filter === "resolved" ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Resolved ({acknowledgedIds.size})
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-bold">{filteredAlerts.length}</span> alert entry records
        </div>
      </div>

      {/* Alert Feed Cards */}
      {isLoadingHistory ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Connecting to emergency alert stream...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
          <Radio className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">No Distress Alerts Recorded</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            When a user triggers the Signal for Help gesture on the camera feed, incoming distress alerts will broadcast here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAlerts.map((alert) => {
            const isResolved = acknowledgedIds.has(alert.id);
            // Default center if lat/lng missing
            const lat = alert.latitude || 37.7749;
            const lng = alert.longitude || -122.4194;

            return (
              <div
                key={alert.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-xl ${
                  isResolved 
                    ? 'border-slate-800 opacity-70' 
                    : 'border-rose-500/50 shadow-rose-950/40 ring-1 ring-rose-500/20'
                }`}
              >
                {/* Alert Card Header */}
                <div className={`p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 ${
                  isResolved ? 'bg-slate-950/60' : 'bg-rose-950/40 border-b border-rose-900/30'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${isResolved ? 'bg-slate-800 text-slate-400' : 'bg-rose-600 text-white animate-pulse'}`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-white">{alert.name || "Anonymous User"}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isResolved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {isResolved ? "RESOLVED" : "ACTIVE DISTRESS"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(alert.timestamp || alert.created_at).toLocaleString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{alert.latitude ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : "Location standard estimated"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acknowledge Button */}
                  <div>
                    {!isResolved ? (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition flex items-center space-x-2 shadow-lg shadow-emerald-950 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Acknowledge Alert</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <CheckCircle className="w-4 h-4" />
                        <span>Acknowledged</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alert Content: Snapshot & Leaflet Map */}
                <div className="p-4 sm:p-6 grid md:grid-cols-12 gap-6">
                  {/* Snapshot Thumbnail */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="text-xs uppercase font-semibold text-slate-400 flex items-center space-x-1">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Captured Video Frame Snapshot</span>
                    </div>
                    <div className="aspect-video bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                      {alert.snapshot_base64 ? (
                        <img
                          src={alert.snapshot_base64}
                          alt="Distress camera snapshot"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-slate-600 text-xs text-center p-4">
                          No camera snapshot captured
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leaflet OpenStreetMap View */}
                  <div className="md:col-span-7 space-y-2">
                    <div className="text-xs uppercase font-semibold text-slate-400 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>Distress Incident Geolocation Map</span>
                    </div>
                    <div className="h-52 rounded-xl overflow-hidden border border-slate-800 z-0 relative">
                      <MapContainer
                        center={[lat, lng]}
                        zoom={13}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[lat, lng]} icon={emergencyIcon}>
                          <Popup>
                            <div className="text-xs text-slate-900 font-bold">
                              <div>{alert.name || "Victim Location"}</div>
                              <div className="text-rose-600 font-normal mt-0.5">Distress Signal Location</div>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
