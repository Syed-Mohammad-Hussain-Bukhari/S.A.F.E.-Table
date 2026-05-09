<<<<<<< HEAD
import httpx, base64
from app.config import settings

async def text_to_speech(text: str) -> dict:
    if not settings.HEYGEN_API_KEY:
        return {"audio_base64": None, "use_browser_tts": True}

    async with httpx.AsyncClient() as client:
        # Tries the HeyGen V2 compatible TTS API utilizing the provided HeyGen key
        res = await client.post(
            "https://api.heygen.com/v2/tts",
            headers={"X-Api-Key": settings.HEYGEN_API_KEY},
            json={"text": text, "voice_id": "1bd001e7e50f421d891986aad5158bc8", "output_format": "mp3"}
        )
        
        if res.status_code == 200:
            data = res.json()
            audio_url = data.get("data", {}).get("audio_url")
            if audio_url:
                audio_res = await client.get(audio_url)
                return {"audio_base64": base64.b64encode(audio_res.content).decode(), "content_type": "audio/mpeg", "use_browser_tts": False}
    
    return {"audio_base64": None, "use_browser_tts": True}
=======
"""
HeyGen TTS Service.

SSRF-hardened:
  • The audio_url returned by HeyGen is validated against an allow-list of
    known HeyGen CDN hostnames before we follow it.
  • The httpx client disables redirects so an attacker-controlled redirect
    chain cannot pivot us onto an internal address (cloud metadata, loopback).
  • Schemes other than https are rejected.
  • Audio response is size-capped so a malicious URL cannot exhaust memory.
"""
import base64
from urllib.parse import urlparse

import httpx

from app.config import settings

# Hosts HeyGen serves audio assets from. Update if HeyGen changes their CDN.
ALLOWED_AUDIO_HOSTS = {
    "resource.heygen.ai",
    "files.heygen.com",
    "files2.heygen.ai",
    "files-resource.heygen.ai",
}

_HEYGEN_TTS_URL = "https://api.heygen.com/v2/tts"
_REQUEST_TIMEOUT = 15.0
_MAX_TEXT_CHARS = 1000
_MAX_AUDIO_BYTES = 4 * 1024 * 1024  # 4 MB


def _validate_audio_url(url: str) -> str:
    """Allow-list audio URLs. Raises ValueError on anything not whitelisted."""
    if not isinstance(url, str) or not url:
        raise ValueError("audio_url missing")
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"audio_url scheme must be https, got '{parsed.scheme}'")
    if parsed.hostname not in ALLOWED_AUDIO_HOSTS:
        raise ValueError(f"audio_url host '{parsed.hostname}' is not whitelisted")
    return url


async def text_to_speech(text: str) -> dict:
    """Synthesize speech via HeyGen. Returns base64 mp3 or a fallback payload
    instructing the client to use browser TTS.

    SSRF guard: we never follow redirects and we only fetch audio from a
    known set of HeyGen CDN hosts."""
    if not settings.HEYGEN_API_KEY:
        return {"audio_base64": None, "use_browser_tts": True}

    if not isinstance(text, str) or not text.strip():
        return {"audio_base64": None, "use_browser_tts": True}
    text = text[:_MAX_TEXT_CHARS]

    async with httpx.AsyncClient(
        timeout=_REQUEST_TIMEOUT,
        follow_redirects=False,
    ) as client:
        try:
            res = await client.post(
                _HEYGEN_TTS_URL,
                headers={"X-Api-Key": settings.HEYGEN_API_KEY},
                json={
                    "text": text,
                    "voice_id": settings.HEYGEN_VOICE_ID,
                    "output_format": "mp3",
                },
            )
        except httpx.HTTPError:
            return {"audio_base64": None, "use_browser_tts": True}

        if res.status_code != 200:
            return {"audio_base64": None, "use_browser_tts": True}

        try:
            audio_url = (res.json().get("data") or {}).get("audio_url")
        except ValueError:
            return {"audio_base64": None, "use_browser_tts": True}

        if not audio_url:
            return {"audio_base64": None, "use_browser_tts": True}

        try:
            audio_url = _validate_audio_url(audio_url)
        except ValueError:
            # Refuse to follow non-whitelisted URLs (SSRF guard).
            return {"audio_base64": None, "use_browser_tts": True}

        try:
            audio_res = await client.get(audio_url)
        except httpx.HTTPError:
            return {"audio_base64": None, "use_browser_tts": True}

        if audio_res.status_code != 200:
            return {"audio_base64": None, "use_browser_tts": True}

        content = audio_res.content
        if len(content) > _MAX_AUDIO_BYTES:
            return {"audio_base64": None, "use_browser_tts": True}

        return {
            "audio_base64": base64.b64encode(content).decode(),
            "content_type": "audio/mpeg",
            "use_browser_tts": False,
        }
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
