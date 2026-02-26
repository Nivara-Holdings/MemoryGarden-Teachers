import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Award, Mic, Play, Pause, ChevronDown, ChevronUp, Pencil, Trash2, Lock, Unlock } from "lucide-react";
import type { Memory } from "@shared/schema";

interface MemoryCardProps {
  memory: Memory;
  isChildView?: boolean;
  onEdit?: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
  onTogglePrivacy?: (memoryId: string, shared: boolean) => void;
}

const memoryTypeConfig = {
  moment: {
    bgClass: "bg-[hsl(var(--sage-light))]",
    accentClass: "text-primary",
    borderClass: "border-primary/20",
    icon: Heart,
    label: "Moment",
  },
  voiceMemo: {
    bgClass: "bg-[hsl(var(--coral))]",
    accentClass: "text-[hsl(var(--coral-dark))]",
    borderClass: "border-[hsl(var(--coral-dark)/0.3)]",
    icon: Mic,
    label: "Voice Memo",
  },
  fromOthers: {
    bgClass: "bg-[hsl(var(--peach))]",
    accentClass: "text-[hsl(var(--peach-dark))]",
    borderClass: "border-[hsl(var(--peach-dark)/0.3)]",
    icon: MessageCircle,
    label: "From Others",
  },
  keepsake: {
    bgClass: "bg-[hsl(var(--lavender))]",
    accentClass: "text-[hsl(var(--lavender-dark))]",
    borderClass: "border-[hsl(var(--lavender-dark)/0.3)]",
    icon: Award,
    label: "Keepsake",
  },
  teacher: {
    bgClass: "bg-[hsl(var(--sky))]",
    accentClass: "text-[hsl(var(--sky-dark))]",
    borderClass: "border-[hsl(var(--sky-dark)/0.3)]",
    icon: MessageCircle,
    label: "From Teacher",
  },
};

function VoiceMemoPlayer({ memory, isChildView }: { memory: Memory; isChildView?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const config = memoryTypeConfig.voiceMemo;

  const waveformHeights = [20, 35, 25, 40, 30, 45, 35, 25, 40, 30, 35, 45, 25, 40, 35, 30, 45, 25, 35, 20];

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlayback = () => {
    if (!memory.mediaUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(memory.mediaUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      };
    }

    audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
      console.error("Playback failed:", err);
      setIsPlaying(false);
    });
  };

  const activeWaveforms = Math.floor(progress * waveformHeights.length);

  return (
    <div className={`${config.bgClass} rounded-2xl p-5`}>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={togglePlayback}
          className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg hover:opacity-90 transition-opacity ${
            memory.mediaUrl ? "bg-[hsl(var(--coral-dark))]" : "bg-gray-400 cursor-not-allowed"
          }`}
          style={{ boxShadow: "0 4px 12px rgba(212, 132, 122, 0.3)" }}
          disabled={!memory.mediaUrl}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </button>

        <div className="flex-1 flex items-center gap-1 h-10">
          {waveformHeights.map((height, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-colors duration-200"
              style={{
                height: `${height}px`,
                backgroundColor: i < activeWaveforms
                  ? "hsl(var(--coral-dark))"
                  : "rgba(212, 132, 122, 0.4)",
              }}
            />
          ))}
        </div>

        <span className={`text-sm font-medium ${config.accentClass} min-w-[40px]`}>
          {memory.duration || "0:00"}
        </span>
      </div>

      <div className={`text-sm font-medium ${config.accentClass} mb-2 flex items-center gap-2`}>
        <Mic className="w-4 h-4" />
        Voice memo from {memory.from}
        {!memory.mediaUrl && <span className="text-xs opacity-60">(text only)</span>}
      </div>

      {memory.rawNote && (
        <div className="mt-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTranscript ? (
              <><ChevronUp className="w-4 h-4" />Hide note</>
            ) : (
              <><ChevronDown className="w-4 h-4" />Show note</>
            )}
          </button>
          {showTranscript && (
            <p className={`mt-3 pt-3 border-t border-[hsl(var(--coral-dark)/0.3)] italic leading-relaxed ${
              isChildView ? "text-base" : "text-[15px]"
            }`}>
              "{memory.refinedNote || memory.rawNote}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MemoryPhotos({ mediaUrl }: { mediaUrl: string }) {
  const [showGallery, setShowGallery] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const urls = mediaUrl.split(",");
  const count = urls.length;

  return (
    <div className="mb-4">
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer"
        onClick={() => { setActiveIndex(0); setShowGallery(true); }}
      >
        <img src={urls[0]} alt="Memory photo" className="w-full h-auto object-cover" />
        {count > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span>+{count - 1} more</span>
          </div>
        )}
      </div>

      {showGallery && (
        <PhotoGallery urls={urls} startIndex={activeIndex} onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}

function PhotoGallery({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex(i => Math.min(i + 1, urls.length - 1));
      if (e.key === "ArrowLeft") setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [urls.length, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden mx-6"
        style={{ maxWidth: "380px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white text-lg font-bold hover:bg-black/70"
        >
          ×
        </button>

        {/* Photo */}
        <div className="p-3">
          <img src={urls[index]} alt="" className="w-full rounded-xl object-contain" style={{ maxHeight: "60vh" }} />
        </div>

        {/* Navigation */}
        {urls.length > 1 && (
          <div className="flex items-center justify-between px-5 pb-4">
            <button
              onClick={() => setIndex(i => Math.max(i - 1, 0))}
              disabled={index === 0}
              className={`text-sm px-3 py-1.5 rounded-lg ${index === 0 ? "text-muted-foreground/30" : "text-primary hover:bg-primary/10"}`}
            >
              ← Prev
            </button>
            <span className="text-xs text-muted-foreground">{index + 1} of {urls.length}</span>
            <button
              onClick={() => setIndex(i => Math.min(i + 1, urls.length - 1))}
              disabled={index === urls.length - 1}
              className={`text-sm px-3 py-1.5 rounded-lg ${index === urls.length - 1 ? "text-muted-foreground/30" : "text-primary hover:bg-primary/10"}`}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioPlayer({ url, duration }: { url: string; duration?: string | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const toggle = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
      <button onClick={toggle} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
      <div className="flex items-center gap-1 flex-1">
        <Mic className="w-3 h-3 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Voice recording</span>
      </div>
      {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
    </div>
  );
}

export default function MemoryCard({ memory, isChildView = false, onEdit, onDelete, onTogglePrivacy }: MemoryCardProps) {
  const isFromTeacher = memory.from?.toLowerCase() === "teacher" || memory.source === "teacher";
  const config = isFromTeacher
    ? memoryTypeConfig.teacher
    : (memoryTypeConfig[memory.type] || memoryTypeConfig.moment);
  const Icon = config.icon;
  const showActions = !isChildView && (onEdit || onDelete || onTogglePrivacy);

  if (memory.type === "voiceMemo") {
    return (
      <div data-testid={`card-memory-${memory.id}`} className="relative">
        {!memory.shared && (
          <div className="absolute top-3 right-3 z-10">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <VoiceMemoPlayer memory={memory} isChildView={isChildView} />
        {showActions && (
          <div className="flex items-center justify-end gap-1 mt-2">
            {onTogglePrivacy && (
              <Button size="icon" variant="ghost" onClick={() => onTogglePrivacy(memory.id, !memory.shared)} className="h-8 w-8">
                {memory.shared ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </Button>
            )}
            {onEdit && (
              <Button size="icon" variant="ghost" onClick={() => onEdit(memory)} className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(memory.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`${config.bgClass} border ${config.borderClass} p-5 relative`} data-testid={`card-memory-${memory.id}`}>
      {!memory.shared && (
        <div className="absolute top-3 right-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      <div className={`flex items-center gap-2 text-sm font-medium ${config.accentClass} mb-3`}>
        <Icon className="w-4 h-4" />
        {memory.type === "fromOthers" || isFromTeacher ? `From ${memory.from}` : config.label}
        {memory.source && !isFromTeacher && <span className="text-muted-foreground font-normal">({memory.source})</span>}
      </div>

      {memory.mediaUrl && memory.mediaType === "image" && (
        <MemoryPhotos mediaUrl={memory.mediaUrl} />
      )}

      {memory.mediaUrl && memory.mediaType === "audio" && (
        <div className="mb-4">
          <AudioPlayer url={memory.mediaUrl} duration={memory.duration} />
        </div>
      )}

      <p className={`leading-relaxed italic text-foreground ${isChildView ? "text-lg" : "text-base"}`}>
        "{memory.refinedNote || memory.rawNote}"
      </p>

      {memory.keepsakeType && (
        <div className={`mt-3 text-sm ${config.accentClass}`}>{memory.keepsakeType}</div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <span className="text-sm text-muted-foreground">{memory.date}</span>
        <div className="flex items-center gap-1">
          {showActions ? (
            <>
              {onTogglePrivacy && (
                <Button size="icon" variant="ghost" onClick={() => onTogglePrivacy(memory.id, !memory.shared)} className="h-8 w-8">
                  {memory.shared ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </Button>
              )}
              {onEdit && (
                <Button size="icon" variant="ghost" onClick={() => onEdit(memory)} className="h-8 w-8">
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button size="icon" variant="ghost" onClick={() => onDelete(memory.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">From {memory.from}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function FeaturedVoiceMemo({ memory, onEdit, onDelete, onTogglePrivacy }: { 
  memory: Memory; 
  onEdit?: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
  onTogglePrivacy?: (memoryId: string, shared: boolean) => void;
}) {
  const showActions = onEdit || onDelete || onTogglePrivacy;
  return (
    <Card className="bg-[hsl(var(--coral))] border border-[hsl(var(--coral-dark)/0.5)] overflow-hidden relative">
      <div className="p-5 relative">
        <VoiceMemoPlayer memory={memory} />
        {showActions && (
          <div className="flex items-center justify-end gap-1 mt-2">
            {onTogglePrivacy && (
              <Button size="icon" variant="ghost" onClick={() => onTogglePrivacy(memory.id, !memory.shared)} className="h-8 w-8">
                {memory.shared ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </Button>
            )}
            {onEdit && (
              <Button size="icon" variant="ghost" onClick={() => onEdit(memory)} className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" onClick={() => onDelete(memory.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
