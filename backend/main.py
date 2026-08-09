import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="SOS Sign Backend",
    description="Emergency Alert Broadcasting Backend API",
    version="1.0.0"
)

# Enable CORS for frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Historical Data for Live Demo Presentation
now_utc = datetime.now(timezone.utc)

alerts_db: List[dict] = [
    {
        "id": "demo-alert-001",
        "name": "Jane Doe",
        "latitude": 43.6532,
        "longitude": -79.3832, # Toronto / Metro Location
        "snapshot_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "timestamp": (now_utc - timedelta(minutes=14)).isoformat(),
        "created_at": (now_utc - timedelta(minutes=14)).isoformat()
    },
    {
        "id": "demo-alert-002",
        "name": "Anonymous User",
        "latitude": 40.7128,
        "longitude": -74.0060, # New York Location
        "snapshot_base64": None,
        "timestamp": (now_utc - timedelta(hours=1, minutes=22)).isoformat(),
        "created_at": (now_utc - timedelta(hours=1, minutes=22)).isoformat()
    }
]

contacts_db: List[dict] = [
    {"id": "1", "name": "Jane Doe (Sister)", "phone_or_email": "+1 (555) 019-2831", "relationship": "Family Member"},
    {"id": "2", "name": "Campus Security", "phone_or_email": "security@campus.edu", "relationship": "Security Desk"}
]

# WebSocket Manager for Live Dashboard Broadcasting
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# Data Validation Models
class AlertPayload(BaseModel):
    name: Optional[str] = "Anonymous User"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    snapshot_base64: Optional[str] = None
    timestamp: Optional[str] = None

class ContactItem(BaseModel):
    name: str
    phone_or_email: str
    relationship: Optional[str] = "Trusted Contact"

class ContactsListPayload(BaseModel):
    contacts: List[ContactItem]

# Health Check Endpoint
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "SOS Sign Backend",
        "version": "1.0.0",
        "active_ws_clients": len(manager.active_connections),
        "total_alerts": len(alerts_db),
        "total_contacts": len(contacts_db)
    }

# 1. POST /alert — Stores alert & broadcasts over WebSocket
@app.post("/alert")
async def create_alert(payload: AlertPayload):
    alert_id = str(uuid.uuid4())
    alert_time = payload.timestamp or datetime.now(timezone.utc).isoformat()
    
    alert_data = {
        "id": alert_id,
        "name": payload.name or "Anonymous User",
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "snapshot_base64": payload.snapshot_base64,
        "timestamp": alert_time,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Prepend to in-memory list (latest first)
    alerts_db.insert(0, alert_data)
    
    # Broadcast event to all connected dashboard WebSockets
    await manager.broadcast({
        "type": "NEW_ALERT",
        "data": alert_data
    })
    
    return {
        "success": True,
        "message": "Emergency alert broadcasted successfully",
        "alert": alert_data
    }

# 2. GET /alerts — Returns alert history
@app.get("/alerts")
def get_alerts():
    return {
        "alerts": alerts_db,
        "count": len(alerts_db)
    }

# 3. GET /contacts — Returns trusted contact entries
@app.get("/contacts")
def get_contacts():
    return {
        "contacts": contacts_db,
        "count": len(contacts_db)
    }

# 4. POST /contacts — Saves trusted contact entries (up to 3)
@app.post("/contacts")
def save_contacts(payload: ContactsListPayload):
    global contacts_db
    updated_contacts = []
    for idx, c in enumerate(payload.contacts[:3]):
        updated_contacts.append({
            "id": str(idx + 1),
            "name": c.name,
            "phone_or_email": c.phone_or_email,
            "relationship": c.relationship or "Trusted Contact"
        })
    contacts_db = updated_contacts
    return {
        "success": True,
        "contacts": contacts_db
    }

# 5. WebSocket /ws/dashboard — Live alert feed
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Welcome message on connection
        await websocket.send_json({
            "type": "CONNECTED",
            "message": "Connected to SOS Sign Emergency Dashboard Stream",
            "total_historical_alerts": len(alerts_db)
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
