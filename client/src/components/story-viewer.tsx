import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Pause, Mic, Heart, MessageCircle, Award, ChevronLeft, ChevronRight } from "lucide-react";
import type { Memory } from "@shared/schema";

interface StoryViewerProps {
  memories: Memory[];
  monthLabel: string;
  childName: string;
  summary?: string;
  onClose: () => void;
}

const typeColors: Record<string, { bg: string; text: string }> = {
  moment: { bg: "rgba(106, 168, 121, 0.15)", text: "hsl(145, 22%, 42%)" },
  voiceMemo: { bg: "rgba(212, 132, 122, 0.15)", text: "hsl(10, 50%, 65%)" },
  fromOthers: { bg: "rgba(220, 180, 140, 0.15)", text: "hsl(30, 50%, 55%)" },
  keepsake: { bg: "rgba(170, 150, 200, 0.15)", text: "hsl(270, 28%, 48%)" },
};

const typeIcons: Record<string, typeof Heart> = {
  moment: Heart,
  voiceMemo: Mic,
  fromOthers: MessageCircle,
  keepsake: Award,
};

export default function StoryViewer({ memories, monthLabel, childName, summary, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Total slides: intro + each memory + outro
  const totalSlides = memories.length + 2;
  const SLIDE_DURATION = 5000; // 5 seconds per slide
  const TICK = 50;

  const goToNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, totalSlides, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused || isAudioPlaying) return;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (TICK / SLIDE_DURATION) * 100;
      });
    }, TICK);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, isAudioPlaying, goToNext]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle tap navigation
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      goToPrev();
    } else if (x > third * 2) {
      goToNext();
    } else {
      setIsPaused(!isPaused);
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setIsAudioPlaying(false);
    audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {});
  };

  const getMemoryForSlide = (index: number): Memory | null => {
    if (index === 0 || index === totalSlides - 1) return null;
    return memories[index - 1] || null;
  };

  const memory = getMemoryForSlide(currentIndex);
  const memoryType = memory?.type || "moment";
  const colors = typeColors[memoryType] || typeColors.moment;
  const Icon = typeIcons[memoryType] || Heart;

  // Determine background
  const isIntro = currentIndex === 0;
  const isOutro = currentIndex === totalSlides - 1;
  const hasImage = memory?.mediaUrl && memory?.mediaType === "image";

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-8 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute top-8 left-4 z-20 text-white/60 text-xs">
          Paused
        </div>
      )}

      {/* Tap zones */}
      <div className="absolute inset-0 z-10" onClick={handleTap} />

      {/* Slide content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* INTRO SLIDE */}
        {isIntro && (
          <div className="w-full h-full flex flex-col items-center justify-center px-8 bg-gradient-to-b from-[hsl(145,22%,35%)] to-[hsl(145,22%,25%)]">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-white/80" />
            </div>
            <h1 className="text-3xl font-serif text-white text-center mb-3">
              {childName}'s {monthLabel}
            </h1>
            <p className="text-white/70 text-center text-base">
              {memories.length} {memories.length === 1 ? "memory" : "memories"} captured
            </p>
            {summary && (
              <p className="text-white/80 text-center text-base mt-6 leading-relaxed max-w-sm italic">
                {summary}
              </p>
            )}
            <div className="absolute bottom-16 flex items-center gap-2 text-white/40 text-sm">
              <ChevronRight className="w-4 h-4" />
              Tap to continue
            </div>
          </div>
        )}

        {/* MEMORY SLIDES */}
        {memory && (
          <div
            className="w-full h-full flex flex-col"
            style={{
              background: hasImage
                ? "black"
                : `linear-gradient(135deg, ${colors.bg}, hsl(45, 60%, 98%))`,
            }}
          >
            {/* Image background */}
            {hasImage && (
              <div className="absolute inset-0">
                <img
                  src={memory.mediaUrl!}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
              </div>
            )}

            {/* Content */}
            <div className={`relative z-10 flex-1 flex flex-col justify-end px-8 pb-24 ${hasImage ? "text-white" : "text-foreground"}`}>
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-4 h-4 ${hasImage ? "text-white/80" : ""}`} style={hasImage ? {} : { color: colors.text }} />
                <span className={`text-sm ${hasImage ? "text-white/70" : "text-muted-foreground"}`}>
                  {memory.type === "voiceMemo" ? "Voice memo" : memory.type === "fromOthers" ? `From ${memory.from}` : memory.type === "keepsake" ? "Keepsake" : "A moment"}
                </span>
              </div>

              {/* The note */}
              <p className={`text-2xl font-serif leading-relaxed ${hasImage ? "text-white" : "text-foreground"}`}>
                "{memory.refinedNote || memory.rawNote}"
              </p>

              {/* Voice memo play button */}
              {memory.type === "voiceMemo" && memory.mediaUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAudioPlaying) {
                      audioRef.current?.pause();
                      setIsAudioPlaying(false);
                    } else {
                      playAudio(memory.mediaUrl!);
                    }
                  }}
                  className="mt-4 flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full px-5 py-3 w-fit"
                >
                  {isAudioPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                  <span className="text-white text-sm">
                    {isAudioPlaying ? "Pause" : "Listen"} · {memory.duration || "0:00"}
                  </span>
                </button>
              )}

              {/* Date & from */}
              <div className={`mt-6 flex items-center gap-2 text-sm ${hasImage ? "text-white/50" : "text-muted-foreground"}`}>
                <span>{memory.date}</span>
                {memory.from && <span>· From {memory.from}</span>}
              </div>
            </div>
          </div>
        )}

        {/* OUTRO SLIDE */}
        {isOutro && (
          <div className="w-full h-full flex flex-col items-center justify-center px-8 bg-gradient-to-b from-[hsl(45,30%,90%)] to-[hsl(45,60%,98%)]">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Heart className="w-8 h-8 text-primary" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-serif text-foreground text-center mb-2">
              {memories.length} memories in {monthLabel}
            </h2>
            <p className="text-muted-foreground text-center text-base">
              Keep growing the garden.
            </p>
          </div>
        )}
      </div>

      {/* Navigation hints */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-8 text-white/30 text-xs">
        <span>← Prev</span>
        <span>Tap to {isPaused ? "play" : "pause"}</span>
        <span>Next →</span>
      </div>
    </div>
  );
}
