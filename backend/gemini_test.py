from dotenv import load_dotenv
load_dotenv()

import os
import urllib.request
import urllib.error
import json

model = os.getenv("GEMINI_MODEL")
key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

payload = {
    "contents": [
        {
            "role": "user",
            "parts": [
                {"text": "Reply with exactly: VeriNova test successful"}
            ]
        }
    ]
}

data = json.dumps(payload).encode("utf-8")

request = urllib.request.Request(
    url,
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

print("MODEL:", model)
print("KEY PREFIX:", key[:6])
print("Sending request...")

try:
    with urllib.request.urlopen(request, timeout=30) as response:
        print("HTTP STATUS:", response.status)
        print(response.read().decode("utf-8"))

except urllib.error.HTTPError as e:
    print("HTTP STATUS:", e.code)
    print("RESPONSE BODY:")
    print(e.read().decode("utf-8"))

except Exception as e:
    print("ERROR:", repr(e))
