import urllib.request
import json

url = "https://ai-health-backend-mgcx.onrender.com/api/chat"
data = {
    "message": "hello, are you connected to the AI?",
    "conversation_id": None
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS:")
    print(resp.read().decode())
except Exception as e:
    import urllib.error
    if isinstance(e, urllib.error.HTTPError):
        print("ERROR:", e.read().decode())
    else:
        print("ERROR:", e)
