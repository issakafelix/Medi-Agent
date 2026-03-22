import urllib.request
import json
import sys

key = "DUMMY"

def test_url(url):
    print("Testing URL:", url)
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
        if hasattr(e, 'read'):
            print(e.read().decode())
        else:
            print(e)
            
print("With v1")
test_url("https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions")
print("Without v1")
test_url("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
