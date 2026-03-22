import urllib.request
import json
import os

key = "DUMMY"
# Let's try what happens if we hit the Gemini API with correct URL
url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
data = {
    "model": "gemini-1.5-flash",
    "messages": [{"role": "user", "content": "hi"}]
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {key}"
})

try:
    resp = urllib.request.urlopen(req)
    print(resp.read().decode())
except Exception as e:
    import urllib.error
    if isinstance(e, urllib.error.HTTPError):
        print(e.read().decode())
    else:
        print(e)
