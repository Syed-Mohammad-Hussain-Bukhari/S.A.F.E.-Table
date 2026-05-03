"""
Speech-to-Text Service (AssemblyAI)
Transcribes audio files to text.
"""
import httpx
import os
import asyncio
from app.config import settings

async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    api_key = getattr(settings, "ASSEMBLYAI_API_KEY", "") or getattr(settings, "OPENAI_API_KEY", "")
    if not api_key: return {"text": "", "success": False, "error": "No STT key"}

    headers = {"authorization": api_key}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            ur = await client.post("https://api.assemblyai.com/v2/upload", headers=headers, data=audio_bytes)
            ur.raise_for_status()
            
            tr = await client.post("https://api.assemblyai.com/v2/transcript", headers=headers, json={"audio_url": ur.json()["upload_url"]})
            tr.raise_for_status()
            
            poll_ep = f"https://api.assemblyai.com/v2/transcript/{tr.json()['id']}"
            while True:
                pr = await client.get(poll_ep, headers=headers)
                pr.raise_for_status()
                data = pr.json()
                
                if data["status"] == "completed":
                    return {"text": data["text"], "language": data.get("language_code", "en"), "success": True}
                elif data["status"] == "error":
                    raise Exception(data.get("error", "Transcription failed"))
                await asyncio.sleep(1)
    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}
