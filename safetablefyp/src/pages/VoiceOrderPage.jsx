import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const VoiceOrderPage = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [orderStatus, setOrderStatus] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  
  const { toast } = useToast();

  const SILENCE_THRESHOLD = 15;
  const SILENCE_DURATION = 1500;

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
    };
  }, []);

  const detectSilence = () => {
    if (!analyserRef.current || !isListening) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
    
    if (average < SILENCE_THRESHOLD) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
          processAudioPayload();
        }, SILENCE_DURATION);
      }
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
    
    if (isListening) requestAnimationFrame(detectSilence);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start(100);
      setIsListening(true);
      setTranscript("");
      setAiResponse("");
      
      detectSilence();
    } catch (err) {
      toast({ title: "Error", description: "Allow microphone access.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  };

  const processAudioPayload = async () => {
    if (audioChunksRef.current.length === 0) return;
    
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
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const toggleListening = () => {
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
          
          {transcript && (
            <div className="p-4 rounded bg-primary/10 mb-4">
              <p className="text-sm font-bold text-primary">You:</p>
              <p>{transcript}</p>
            </div>
          )}
          
          {aiResponse && (
            <div className="p-4 rounded bg-card border">
              <p className="text-sm font-bold">AI:</p>
              <p>{aiResponse}</p>
              {orderStatus && <p className="text-green-500 mt-2 font-bold">{orderStatus}</p>}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
export default VoiceOrderPage;