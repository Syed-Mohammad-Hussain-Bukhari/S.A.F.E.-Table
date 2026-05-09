<<<<<<< HEAD
﻿import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const VoiceOrderPage = () => {
=======
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { voiceApi } from "@/lib/api";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const SILENCE_THRESHOLD = 15;
const SILENCE_DURATION = 1500;

const VoiceOrderPage = () => {
  const { toast } = useToast();
  const { tableNumber, hasTicket, start, loading } = useCustomerSession();

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [orderStatus, setOrderStatus] = useState(null);
<<<<<<< HEAD
  
=======
  const [tableInput, setTableInput] = useState(1);

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const streamRef = useRef(null);
<<<<<<< HEAD
  const audioPlayerRef = useRef(new Audio());
  
  const { toast } = useToast();

  const SILENCE_THRESHOLD = 15;
  const SILENCE_DURATION = 1500;

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
    };
=======
  const audioPlayerRef = useRef(typeof Audio !== "undefined" ? new Audio() : null);

  useEffect(() => () => {
    stopRecording();
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  }, []);

  const detectSilence = () => {
    if (!analyserRef.current || !isListening) return;
<<<<<<< HEAD
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
    
    if (average < SILENCE_THRESHOLD) {
=======
    const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(buf);
    const avg = buf.reduce((a, v) => a + v, 0) / buf.length;
    if (avg < SILENCE_THRESHOLD) {
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
          processAudioPayload();
        }, SILENCE_DURATION);
      }
<<<<<<< HEAD
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
    
=======
    } else if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    if (isListening) requestAnimationFrame(detectSilence);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
<<<<<<< HEAD
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
=======
      const Ctx = window.AudioContext || window["webkitAudioContext"];
      audioContextRef.current = new Ctx();
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
<<<<<<< HEAD

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

=======
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
      mediaRecorderRef.current.start(100);
      setIsListening(true);
      setTranscript("");
      setAiResponse("");
<<<<<<< HEAD
      
      detectSilence();
    } catch (err) {
      toast({ title: "Error", description: "Allow microphone access.", variant: "destructive" });
=======
      detectSilence();
    } catch {
      toast({ title: "Microphone error", description: "Allow microphone access.", variant: "destructive" });
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    }
  };

  const stopRecording = () => {
    setIsListening(false);
<<<<<<< HEAD
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
=======
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  };

  const processAudioPayload = async () => {
    if (audioChunksRef.current.length === 0) return;
<<<<<<< HEAD
    
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    
    formData.append("audio", audioBlob, "voice.webm");
    formData.append("table_number", "1");
    formData.append("language", "en");

    try {
      const res = await api.post("/voice/order", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = res.data;
      
      if (data.success) {
        setTranscript(data.transcript);
        setAiResponse(data.response_text);
        
        if (data.order_placed) {
          setOrderStatus(`Order Confirmed: ${data.order_id}`);
        }

        if (data.audio_base64) {
          audioPlayerRef.current.src = `data:${data.audio_content_type || "audio/mp3"};base64,${data.audio_base64}`;
          audioPlayerRef.current.play().catch(console.error);
        } else if (data.use_browser_tts) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.response_text));
        }
      }
    } catch (err) {
      toast({ title: "Failed", description: "Could not process order. Speak clearly.", variant: "destructive" });
=======
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    try {
      const data = await voiceApi.order({ audio: audioBlob, language: "en" });
      if (data?.success) {
        setTranscript(data.transcript || "");
        setAiResponse(data.response_text || "");
        if (data.order_placed) setOrderStatus(`Order Confirmed: ${data.order_id}`);
        if (data.audio_base64 && audioPlayerRef.current) {
          audioPlayerRef.current.src = `data:${data.audio_content_type || "audio/mp3"};base64,${data.audio_base64}`;
          audioPlayerRef.current.play().catch(() => {});
          audioPlayerRef.current.onended = () => { audioPlayerRef.current.src = ""; };
        } else if (data.use_browser_tts && data.response_text) {
          window.speechSynthesis?.speak(new SpeechSynthesisUtterance(data.response_text));
        }
      } else if (data?.response_text) {
        setAiResponse(data.response_text);
      }
    } catch (err) {
      toast({ title: "Voice order failed", description: err.message, variant: "destructive" });
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const toggleListening = () => {
<<<<<<< HEAD
    if (isListening) {
      stopRecording();
      processAudioPayload();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-12">Voice Ordering</h1>
        <Card className="glass-morphism border-2 border-primary/30 p-8 w-full max-w-2xl">
          <div className="flex justify-center mb-8">
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isListening ? "bg-destructive" : "bg-primary"}`}>
              {isProcessing ? <Loader2 className="w-12 h-12 text-white animate-spin" /> : isListening ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
            </button>
          </div>
          
=======
    if (isListening) { stopRecording(); processAudioPayload(); }
    else startRecording();
  };

  if (!hasTicket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-morphism p-8 max-w-md w-full border-2 border-yellow-500/30">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
            <div>
              <h2 className="font-bold mb-1">Pick your table</h2>
              <p className="text-sm text-muted-foreground">Voice ordering requires an active table session.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number" min={1} max={50} value={tableInput}
              onChange={(e) => setTableInput(Number(e.target.value) || 1)}
              className="w-24 h-10 px-3 rounded-md bg-input border border-border" />
            <Button onClick={() => start(tableInput)} disabled={loading}>
              {loading ? "Starting…" : `Start at #${tableInput}`}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-2">Voice Ordering</h1>
        <p className="text-muted-foreground mb-12">Table #{tableNumber}</p>
        <Card className="glass-morphism border-2 border-primary/30 p-8 w-full max-w-2xl">
          <div className="flex justify-center mb-8">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              disabled={isProcessing}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isListening ? "bg-destructive" : "bg-primary"}`}>
              {isProcessing ? <Loader2 className="w-12 h-12 text-white animate-spin" /> :
               isListening ? <MicOff className="w-12 h-12 text-white" /> :
                             <Mic className="w-12 h-12 text-white" />}
            </motion.button>
          </div>

>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
          {transcript && (
            <div className="p-4 rounded bg-primary/10 mb-4">
              <p className="text-sm font-bold text-primary">You:</p>
              <p>{transcript}</p>
            </div>
          )}
<<<<<<< HEAD
          
          {aiResponse && (
            <div className="p-4 rounded bg-card border">
              <p className="text-sm font-bold">AI:</p>
=======
          {aiResponse && (
            <div className="p-4 rounded bg-card border">
              <p className="text-sm font-bold">SAGE:</p>
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
              <p>{aiResponse}</p>
              {orderStatus && <p className="text-green-500 mt-2 font-bold">{orderStatus}</p>}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
<<<<<<< HEAD
export default VoiceOrderPage;
=======

export default VoiceOrderPage;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
