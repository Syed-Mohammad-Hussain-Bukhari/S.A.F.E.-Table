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