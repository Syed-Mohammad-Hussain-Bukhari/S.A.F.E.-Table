from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.services.grok_service import process_voice_order
from app.services.whisper_service import transcribe_audio
from app.services.heygen_service import text_to_speech
from app.websockets.kitchen import manager
from typing import Optional

router = APIRouter(prefix="/api/voice", tags=["Voice"])

@router.post("/order")
async def voice_order(
    audio: Optional[UploadFile] = File(None),
    transcript: Optional[str] = Form(None),
    table_number: int = Form(1),
    language: str = Form("en"),
):
    final_transcript = ""

    # STT Conversion
    if audio and audio.filename:
        audio_bytes = await audio.read()
        if len(audio_bytes) > 0:
            stt_result = await transcribe_audio(audio_bytes, audio.filename)
            if stt_result["success"]:
                final_transcript = stt_result["text"]

    if not final_transcript and transcript:
        final_transcript = transcript

    if not final_transcript:
        raise HTTPException(status_code=400, detail="No audio transcribed successfully.")

    # AI & Order Intent
    groq_result = await process_voice_order(
        transcript=final_transcript,
        language=language,
        table_number=table_number,
    )

    # TTS Output
    try:
        tts_result = await text_to_speech(groq_result["response_text"])
    except Exception:
        tts_result = {"audio_base64": None, "use_browser_tts": True}

    # Broadcast
    if groq_result.get("order_placed") and groq_result.get("order_data"):
        await manager.broadcast_new_order(groq_result["order_data"])

    return {
        "success": True,
        "transcript": final_transcript,
        "response_text": groq_result["response_text"],
        "order_placed": groq_result.get("order_placed", False),
        "order_id": groq_result.get("order_id"),
        "audio_base64": tts_result.get("audio_base64"),
        "audio_content_type": tts_result.get("content_type", "audio/mpeg"),
        "use_browser_tts": tts_result.get("use_browser_tts", True),
    }