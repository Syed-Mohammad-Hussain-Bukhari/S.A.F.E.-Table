import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { voiceApi } from "@/lib/api";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const SILENCE_THRESHOLD = 15;
const SILENCE_DURATION = 1500;

const VoiceOrderPage = () => {
  const { toast } = useToast();
  const { tableNumber, hasTicket, start, loading } = useCustomerSession();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [orderStatus, setOrderStatus] = useState(null);
  const [tableInput, setTableInput] = useState(1);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(typeof Audio !== "undefined" ? new Audio() : null);

  // Cleanup on unmount
  useEffect(() => () => {
    stopRecording();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
    }
  }, []);

  const detectSilence = () => {
    if (!analyserRef.current || !isListening) return;
    const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(buf);
    const avg = buf.reduce((a, v) => a + v, 0) / buf.length;

    if (avg < SILENCE_THRESHOLD) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
          processAudioPayload();
        }, SILENCE_DURATION);
      }
    } else if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (isListening) requestAnimationFrame(detectSilence);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || window["webkitAudioContext"];
      audioContextRef.current = new Ctx();
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
      setOrderStatus(null);
      detectSilence();
    } catch {
      toast({ title: "Microphone error", description: "Please allow microphone access to use voice ordering.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  };

  const processAudioPayload = async () => {
    if (audioChunksRef.current.length === 0) return;
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    try {
      const data = await voiceApi.order({
        audio: audioBlob,
        language: "en",
        table_number: tableNumber,
      });

      if (data?.success) {
        setTranscript(data.transcript || "");
        setAiResponse(data.response_text || "");
        if (data.order_placed) setOrderStatus(`Order Confirmed: ${data.order_id}`);

        if (data.audio_base64 && audioPlayerRef.current) {
          audioPlayerRef.current.src = `data:${data.audio_content_type || "audio/mp3"};base64,${data.audio_base64}`;
          audioPlayerRef.current.play().catch(() => {});
          audioPlayerRef.current.onended = () => { audioPlayerRef.current.src = ""; };
        } else if (data.use_browser_tts && data.response_text) {
          const utterance = new SpeechSynthesisUtterance(data.response_text);
          window.speechSynthesis?.speak(utterance);
        }
      } else if (data?.response_text) {
        setAiResponse(data.response_text);
      }
    } catch (err) {
      toast({ title: "Voice order failed", description: err.message, variant: "destructive" });
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

  const handleStartSession = async () => {
    const result = await start(tableInput);
    if (!result?.success) {
      toast({
        title: "Unable to start session",
        description: result?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!hasTicket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-morphism p-8 max-w-md w-full border-2 border-yellow-500/30">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-xl mb-1">Session Required</h2>
              <p className="text-sm text-muted-foreground">Please select your table number to enable voice commands and order synchronization.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number" min={1} max={50} value={tableInput}
              onChange={(e) => setTableInput(Number(e.target.value) || 1)}
              className="w-24 h-10 px-3 rounded-md bg-input border border-border" />
            <Button onClick={handleStartSession} disabled={loading} className="flex-1">
              {loading ? "Starting…" : `Join Table #${tableInput}`}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container px-4 py-4 flex items-center gap-4">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-bold">Voice Assistant</h1>
          <div className="ml-auto bg-primary/10 px-3 py-1 rounded-full text-xs font-medium text-primary">
            Table #{tableNumber}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-2">Speak to Order</h1>
        <p className="text-muted-foreground mb-12 text-center max-w-sm">
          "I'd like a double cheeseburger and a coke"
        </p>

        <Card className="glass-morphism border-2 border-primary/30 p-8 w-full max-w-2xl relative overflow-hidden">
          <div className="flex justify-center mb-8">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              disabled={isProcessing}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                isListening ? "bg-destructive animate-pulse" : "bg-primary"
              }`}
            >
              {isProcessing ? <Loader2 className="w-12 h-12 text-white animate-spin" /> :
               isListening ? <MicOff className="w-12 h-12 text-white" /> :
                             <Mic className="w-12 h-12 text-white" />}
            </motion.button>
          </div>

          <div className="space-y-4">
            {transcript && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">You said:</p>
                <p className="text-lg">{transcript}</p>
              </motion.div>
            )}

            {aiResponse && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-card border shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">SAGE Assistant:</p>
                <p className="text-lg italic">"{aiResponse}"</p>
                {orderStatus && (
                  <div className="mt-3 py-2 px-3 bg-green-500/10 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-green-600 text-sm font-bold">{orderStatus}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default VoiceOrderPage;