import base64
import os

SECRET_KEY = os.getenv("SECRET_KEY", "verinova_fallback_encryption_key_123")

def encrypt_data(data: str) -> str:
    if not data:
        return ""
    key = SECRET_KEY
    # XOR key matching length
    xor_bytes = bytearray(a ^ ord(key[i % len(key)]) for i, a in enumerate(data.encode('utf-8')))
    return base64.b64encode(xor_bytes).decode('utf-8')

def decrypt_data(token: str) -> str:
    if not token:
        return ""
    key = SECRET_KEY
    try:
        raw_bytes = base64.b64decode(token.encode('utf-8'))
        xor_bytes = bytearray(a ^ ord(key[i % len(key)]) for i, a in enumerate(raw_bytes))
        return xor_bytes.decode('utf-8')
    except Exception:
        return ""
