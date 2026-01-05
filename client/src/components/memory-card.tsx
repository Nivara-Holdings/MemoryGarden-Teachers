import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Award, Mic, Play, Pause, ChevronDown, ChevronUp } from "lucide-react";
import type { Memory } from "@shared/schema";

interface MemoryCardProps {
  memory: Memory;
  isChildView?: boolean;
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
};

function VoiceMemoPlayer({ memory, isChildView }: { memory: Memory; isChildView?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const config = memoryTypeConfig.voiceMemo;

  const waveformHeights = [20, 35, 25, 40, 30, 45, 35, 25, 40, 30, 35, 45, 25, 40, 35, 30, 45, 25, 35, 20];

  return (
    <div className={`${config.bgClass} rounded-2xl p-5`}>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-14 h-14 rounded-full bg-[hsl(var(--coral-dark))] flex items-center justify-center flex-shrink-0 shadow-lg hover:opacity-90 transition-opacity"
          style={{ boxShadow: "0 4px 12px rgba(212, 132, 122, 0.3)" }}
          data-testid={`button-play-${memory.id}`}
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
                backgroundColor: isPlaying && i < 8
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
      </div>

      {memory.transcript && (
        <div className="mt-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`button-transcript-${memory.id}`}
          >
            {showTranscript ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide transcript
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show transcript
              </>
            )}
          </button>
          {showTranscript && (
            <p
              className={`mt-3 pt-3 border-t border-[hsl(var(--coral-dark)/0.3)] italic leading-relaxed ${
                isChildView ? "text-base" : "text-[15px]"
              }`}
            >
              "{memory.note}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MemoryCard({ memory, isChildView = false }: MemoryCardProps) {
  const config = memoryTypeConfig[memory.type] || memoryTypeConfig.moment;
  const Icon = config.icon;

  if (memory.type === "voiceMemo") {
    return (
      <div className="mb-4" data-testid={`card-memory-${memory.id}`}>
        <VoiceMemoPlayer memory={memory} isChildView={isChildView} />
      </div>
    );
  }

  return (
    <Card
      className={`${config.bgClass} border ${config.borderClass} p-5 mb-4`}
      data-testid={`card-memory-${memory.id}`}
    >
      <div className={`flex items-center gap-2 text-sm font-medium ${config.accentClass} mb-3`}>
        <Icon className="w-4 h-4" />
        {memory.type === "fromOthers" ? `From ${memory.from}` : config.label}
        {memory.source && (
          <span className="text-muted-foreground font-normal">
            ({memory.source})
          </span>
        )}
      </div>

      <p className={`leading-relaxed italic text-foreground ${isChildView ? "text-lg" : "text-base"}`}>
        "{memory.note}"
      </p>

      {memory.keepsakeType && (
        <div className={`mt-3 text-sm ${config.accentClass}`}>
          {memory.keepsakeType}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <span className="text-sm text-muted-foreground">{memory.date}</span>
        <span className="text-sm text-muted-foreground">From {memory.from}</span>
      </div>
    </Card>
  );
}

export function FeaturedVoiceMemo({ memory }: { memory: Memory }) {
  return (
    <Card
      className="bg-[hsl(var(--coral))] border border-[hsl(var(--coral-dark)/0.5)] overflow-hidden mb-4"
      data-testid="card-featured-voice"
    >
      <div className="absolute top-3 right-3 text-xs text-[hsl(var(--coral-dark))] bg-white px-3 py-1 rounded-full z-10">
        Listen to this
      </div>
      <div className="p-5 pt-10 relative">
        <VoiceMemoPlayer memory={memory} />
      </div>
    </Card>
  );
}
