<<<<<<< HEAD
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
=======
"""
Voice Order Route — bound to a customer ticket.

The customer's ticket carries (table_number, session_id). Both come from
the ticket — never from the form body — so an attacker cannot place voice
orders on a table they don't occupy.
"""
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.routes.auth import verify_customer_ticket
from app.services.grok_service import process_voice_order
from app.services.heygen_service import text_to_speech
from app.services.whisper_service import transcribe_audio
from app.websockets.kitchen import manager

router = APIRouter(prefix="/api/voice", tags=["Voice"])

_MAX_AUDIO_BYTES = 8 * 1024 * 1024
_MAX_TRANSCRIPT_LEN = 1000


@router.post("/order")
async def voice_order(
    customer_ticket: str = Form(...),
    audio: Optional[UploadFile] = File(None),
    transcript: Optional[str] = Form(None),
    language: str = Form("en"),
):
    """Place a voice order. Required: a valid customer_ticket form field."""
    payload = verify_customer_ticket(customer_ticket)
    table_number: int = payload["table_number"]
    session_id: str = payload["session_id"]

    final_transcript = ""

    # ── Speech-to-text (when audio provided) ─────────────────────────────
    if audio and audio.filename:
        audio_bytes = await audio.read()
        if len(audio_bytes) > _MAX_AUDIO_BYTES:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Audio exceeds {_MAX_AUDIO_BYTES // (1024*1024)} MB",
            )
        if audio_bytes:
            stt_result = await transcribe_audio(audio_bytes, audio.filename)
            if stt_result.get("success"):
                final_transcript = stt_result.get("text", "")
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

    if not final_transcript and transcript:
        final_transcript = transcript

    if not final_transcript:
<<<<<<< HEAD
        raise HTTPException(status_code=400, detail="No audio transcribed successfully.")

    # AI & Order Intent
=======
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "No audio transcribed successfully")

    final_transcript = final_transcript[:_MAX_TRANSCRIPT_LEN]

    # ── LLM order pipeline (validates session unconditionally) ───────────
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    groq_result = await process_voice_order(
        transcript=final_transcript,
        language=language,
        table_number=table_number,
<<<<<<< HEAD
    )

    # TTS Output
=======
        session_id=session_id,
    )

    # Best-effort TTS — never fatal.
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    try:
        tts_result = await text_to_speech(groq_result["response_text"])
    except Exception:
        tts_result = {"audio_base64": None, "use_browser_tts": True}

<<<<<<< HEAD
    # Broadcast
=======
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    if groq_result.get("order_placed") and groq_result.get("order_data"):
        await manager.broadcast_new_order(groq_result["order_data"])

    return {
<<<<<<< HEAD
        "success": True,
=======
        "success": groq_result.get("success", True),
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
        "transcript": final_transcript,
        "response_text": groq_result["response_text"],
        "order_placed": groq_result.get("order_placed", False),
        "order_id": groq_result.get("order_id"),
        "audio_base64": tts_result.get("audio_base64"),
        "audio_content_type": tts_result.get("content_type", "audio/mpeg"),
        "use_browser_tts": tts_result.get("use_browser_tts", True),
<<<<<<< HEAD
    }
=======
    }
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
