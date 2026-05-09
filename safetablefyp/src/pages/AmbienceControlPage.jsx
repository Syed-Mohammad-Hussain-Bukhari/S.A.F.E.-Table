import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
<<<<<<< HEAD
import { ArrowLeft, Lightbulb, Music, Thermometer, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const moods = ["Romantic", "Energetic", "Relaxed"];
const genres = ["Jazz", "Classical", "Lounge"];

const AmbienceControlPage = () => {
  const [brightness, setBrightness] = useState([70]);
  const [temperature, setTemperature] = useState([22]);
  const [volume, setVolume] = useState([50]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    // Adjust brightness based on mood
    if (mood === "Romantic") setBrightness([30]);else
    if (mood === "Energetic") setBrightness([90]);else
    if (mood === "Relaxed") setBrightness([50]);
    toast.success(`${mood} mood activated`, {
      description: "Lighting adjusted to match the ambience"
    });
  };

  const handleGenreSelect = (genre) => {
    setSelectedGenre(genre);
    toast.success(`Now playing ${genre}`, {
      description: `Volume set to ${volume[0]}%`
    });
=======
import { ArrowLeft, Lightbulb, Music, Thermometer, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ambienceApi } from "@/lib/api";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const PRESETS = ["default", "romantic_dinner", "family_gathering", "business_meeting", "celebration"];
const PRESET_LABELS = {
  default: "Default",
  romantic_dinner: "Romantic",
  family_gathering: "Family",
  business_meeting: "Business",
  celebration: "Celebration",
};

const AmbienceControlPage = () => {
  const { tableNumber } = useCustomerSession();
  const tn = tableNumber || 1;

  const [brightness, setBrightness] = useState([75]);
  const [volume, setVolume] = useState([50]);
  const [temperature, setTemperature] = useState([22]);
  const [preset, setPreset] = useState("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ambienceApi.get(tn)
      .then((s) => {
        if (cancelled) return;
        setBrightness([s.brightness ?? 75]);
        setVolume([s.music_volume ?? 50]);
        setPreset(s.preset || "default");
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tn]);

  const persist = async (patch) => {
    setSaving(true);
    try {
      await ambienceApi.update(tn, patch);
    } catch (err) {
      toast.error(`Couldn't save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = async (p) => {
    setPreset(p);
    setSaving(true);
    try {
      const updated = await ambienceApi.applyPreset(tn, p);
      setBrightness([updated.brightness ?? 75]);
      setVolume([updated.music_volume ?? 50]);
      toast.success(`${PRESET_LABELS[p]} mode activated`);
    } catch (err) {
      toast.error(`Couldn't apply preset: ${err.message}`);
    } finally {
      setSaving(false);
    }
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
  };

  return (
    <div className="min-h-screen bg-background">
<<<<<<< HEAD
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Ambience Control</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-secondary to-accent mb-6">
              <Lightbulb className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Set the Perfect Mood
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Control lighting, temperature, and music with your voice or touch
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold">Lighting</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Brightness</span>
                    <span className="text-sm font-medium">{brightness[0]}%</span>
                  </div>
                  <Slider value={brightness} onValueChange={setBrightness} max={100} step={1} />
                </div>
                <div className="flex gap-2">
                  {moods.map((mood) =>
                  <Button
                    key={mood}
                    variant={selectedMood === mood ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMoodSelect(mood)}
                    className={selectedMood === mood ? "bg-primary text-primary-foreground" : ""}>
                    
                      {mood}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Thermometer className="w-6 h-6 text-secondary" />
                <h3 className="text-xl font-bold">Temperature</h3>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Climate Control</span>
                  <span className="text-sm font-medium">{temperature[0]}°C</span>
                </div>
                <Slider value={temperature} onValueChange={setTemperature} min={18} max={26} step={1} />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Music className="w-6 h-6 text-accent" />
                <h3 className="text-xl font-bold">Music</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Volume</span>
                    <span className="text-sm font-medium">{volume[0]}%</span>
                  </div>
                  <Slider value={volume} onValueChange={setVolume} max={100} step={1} />
                </div>
                <div className="flex gap-2">
                  {genres.map((genre) =>
                  <Button
                    key={genre}
                    variant={selectedGenre === genre ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleGenreSelect(genre)}
                    className={selectedGenre === genre ? "bg-accent text-accent-foreground" : ""}>
                    
                      {genre}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
=======
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container px-4 py-4 flex items-center gap-4">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-2xl font-bold">Ambience Control</h1>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
        </div>
      </header>

      <main className="container px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-secondary to-accent mb-6"><Lightbulb className="w-12 h-12 text-white" /></div>
            <h2 className="text-4xl font-bold mb-4">Set the Perfect Mood</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Table #{tn} — controls applied live</p>
          </div>

          {loading ? (
            <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4"><Lightbulb className="w-6 h-6 text-primary" /><h3 className="text-xl font-bold">Lighting</h3></div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">Brightness</span><span className="text-sm font-medium">{brightness[0]}%</span></div>
                    <Slider value={brightness} onValueChange={setBrightness} onValueCommit={(v) => persist({ brightness: v[0] })} max={100} step={1} />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4"><Thermometer className="w-6 h-6 text-secondary" /><h3 className="text-xl font-bold">Temperature</h3></div>
                <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">Climate Control</span><span className="text-sm font-medium">{temperature[0]}°C</span></div>
                <Slider value={temperature} onValueChange={setTemperature} min={18} max={26} step={1} />
                <p className="text-xs text-muted-foreground mt-2">Local-only (HVAC integration not implemented)</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4"><Music className="w-6 h-6 text-accent" /><h3 className="text-xl font-bold">Music</h3></div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-muted-foreground">Volume</span><span className="text-sm font-medium">{volume[0]}%</span></div>
                    <Slider value={volume} onValueChange={setVolume} onValueCommit={(v) => persist({ music_volume: v[0] })} max={100} step={1} />
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 mb-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold mb-2">Presets</h3>
                <p className="text-muted-foreground mb-4">One-tap moods saved to your table.</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button key={p} variant={preset === p ? "default" : "outline"} size="sm"
                            onClick={() => handlePreset(p)} disabled={saving}>
                      {PRESET_LABELS[p]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold mb-2">Voice Control Available</h3>
<<<<<<< HEAD
                <p className="text-muted-foreground mb-4">
                  Simply say "Alexa, set romantic lighting" or "Hey Google, make it warmer"
                </p>
                <Link to="/voice-order">
                  <Button variant="outline">Try Voice Commands</Button>
                </Link>
=======
                <p className="text-muted-foreground mb-4">Try voice commands at our voice ordering page.</p>
                <Link to="/voice-order"><Button variant="outline">Try Voice Commands</Button></Link>
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
<<<<<<< HEAD
    </div>);

};

export default AmbienceControlPage;
=======
    </div>
  );
};

export default AmbienceControlPage;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
