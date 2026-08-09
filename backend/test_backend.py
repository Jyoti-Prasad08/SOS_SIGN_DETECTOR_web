import asyncio
import json
import urllib.request
import websockets

BACKEND_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/dashboard"

async def test_backend():
    print("==========================================")
    print("   SOS SIGN BACKEND AUTOMATED TEST SUITE  ")
    print("==========================================\n")

    # 1. Test GET /health
    print("[1/5] Testing GET /health...")
    req = urllib.request.urlopen(f"{BACKEND_URL}/health")
    res = json.loads(req.read().decode())
    print("    Result:", json.dumps(res, indent=2))
    assert res["status"] == "ok"
    print("    [PASS] Health check successful.\n")

    # 2. Test GET /contacts
    print("[2/5] Testing GET /contacts...")
    req = urllib.request.urlopen(f"{BACKEND_URL}/contacts")
    res = json.loads(req.read().decode())
    print(f"    Fetched {res['count']} contacts:")
    print("    Result:", json.dumps(res["contacts"], indent=2))
    assert "contacts" in res
    print("    [PASS] Contacts retrieved successfully.\n")

    # 3. Test POST /contacts
    print("[3/5] Testing POST /contacts...")
    new_contacts_data = json.dumps({
        "contacts": [
            {"name": "Alice Smith", "phone_or_email": "+1-555-0100", "relationship": "Sister"},
            {"name": "Bob Johnson", "phone_or_email": "bob@example.com", "relationship": "Roommate"}
        ]
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BACKEND_URL}/contacts",
        data=new_contacts_data,
        headers={"Content-Type": "application/json"}
    )
    res = json.loads(urllib.request.urlopen(req).read().decode())
    print("    Result:", json.dumps(res, indent=2))
    assert res["success"] is True
    print("    [PASS] Contacts saved successfully.\n")

    # 4. Test WebSocket /ws/dashboard & POST /alert Trigger
    print("[4/5] Testing WebSocket /ws/dashboard & POST /alert broadcast...")
    async with websockets.connect(WS_URL) as ws:
        connected_msg = await ws.recv()
        print("    [WS Connected Received]:", connected_msg)

        # Trigger POST /alert in background while listening on WS
        print("    Sending POST /alert payload...")
        alert_payload = json.dumps({
            "name": "Test User",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "snapshot_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "timestamp": "2026-08-09T11:45:00Z"
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{BACKEND_URL}/alert",
            data=alert_payload,
            headers={"Content-Type": "application/json"}
        )
        post_res = json.loads(urllib.request.urlopen(req).read().decode())
        print("    [POST /alert Response]:", json.dumps(post_res, indent=2))

        # Receive broadcast over WebSocket
        ws_broadcast = await ws.recv()
        print("    [WS Broadcast Received]:", ws_broadcast)
        ws_data = json.loads(ws_broadcast)
        assert ws_data["type"] == "NEW_ALERT"
        assert ws_data["data"]["name"] == "Test User"
        print("    [PASS] Alert successfully broadcasted over WebSocket!\n")

    # 5. Test GET /alerts History
    print("[5/5] Testing GET /alerts history...")
    req = urllib.request.urlopen(f"{BACKEND_URL}/alerts")
    res = json.loads(req.read().decode())
    print(f"    Total history count: {res['count']}")
    print("    Latest alert entry:", json.dumps(res["alerts"][0], indent=2))
    assert res["count"] >= 1
    print("    [PASS] Alert history returned successfully.\n")

    print("==========================================")
    print("   ALL BACKEND TESTS PASSED SUCCESSFULLY! ")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(test_backend())
