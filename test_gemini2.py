import urllib.request
import json
import sys

key = "DUMMY"


def check_url(url):
    """Helper to POST a minimal chat payload to the given URL and print the result.

    This module is not a pytest test; calling is guarded under __main__ so pytest
    won't try to collect fixtures or execute network calls during CI.
    """
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
            try:
                print(e.read().decode())
            except Exception:
                print(repr(e))
        else:
            print(repr(e))


if __name__ == "__main__":
    print("With v1")
    check_url("https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions")
    print("Without v1")
    check_url("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
