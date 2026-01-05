import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Heart, Mic, MessageCircle, Award, Sparkles, X } from "lucide-react";
import type { MemoryType, InsertMemory } from "@shared/schema";

interface AddMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (memory: Omit<InsertMemory, "parentId">) => void;
  childId: string;
}

const memoryTypeOptions = [
  {
    type: "moment" as MemoryType,
    label: "A moment I noticed",
    description: "Something special they did",
    icon: Heart,
    bgClass: "bg-[hsl(var(--sage-light))]",
    borderClass: "border-primary",
  },
  {
    type: "voiceMemo" as MemoryType,
    label: "Voice memo",
    description: "Record your voice",
    icon: Mic,
    bgClass: "bg-[hsl(var(--coral))]",
    borderClass: "border-[hsl(var(--coral-dark))]",
  },
  {
    type: "fromOthers" as MemoryType,
    label: "From others",
    description: "Words from someone else",
    icon: MessageCircle,
    bgClass: "bg-[hsl(var(--peach))]",
    borderClass: "border-[hsl(var(--peach-dark))]",
  },
  {
    type: "keepsake" as MemoryType,
    label: "Keepsake",
    description: "Awards, artwork, milestones",
    icon: Award,
    bgClass: "bg-[hsl(var(--lavender))]",
    borderClass: "border-[hsl(var(--lavender-dark))]",
  },
];

const llmSuggestions = [
  "You remembered what I did two years ago. And tonight, you became that person yourself. I'm so proud.",
  "Integrity isn't taught. It's caught. You caught it. I saw it tonight.",
  "The sandwich didn't matter. Who you are does. And tonight, you showed me who you are.",
];

export default function AddMemoryDialog({
  open,
  onOpenChange,
  onSubmit,
  childId,
}: AddMemoryDialogProps) {
  const [step, setStep] = useState<"type" | "content">("type");
  const [selectedType, setSelectedType] = useState<MemoryType>("moment");
  const [note, setNote] = useState("");
  const [from, setFrom] = useState("Mom");
  const [source, setSource] = useState("");
  const [keepsakeType, setKeepsakeType] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const resetState = () => {
    setStep("type");
    setSelectedType("moment");
    setNote("");
    setFrom("Mom");
    setSource("");
    setKeepsakeType("");
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleSubmit = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const memory: Omit<InsertMemory, "parentId"> = {
      type: selectedType,
      rawNote: note,
      date: dateStr,
      shared: true,
      from,
      childId,
      ...(selectedType === "voiceMemo" && {
        duration: `${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, "0")}`,
      }),
      ...(selectedType === "fromOthers" && { source }),
      ...(selectedType === "keepsake" && { keepsakeType }),
    };

    onSubmit(memory);
    resetState();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleTypeSelect = (type: MemoryType) => {
    setSelectedType(type);
    setStep("content");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            {step === "content" && (
              <button
                onClick={() => setStep("type")}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
                data-testid="button-back-type"
              >
                ←
              </button>
            )}
            <DialogTitle className="text-lg flex-1 text-center" data-testid="text-dialog-title">
              {step === "type" ? "Add Memory" : "New Memory"}
            </DialogTitle>
            <button
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-close-dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {step === "type" && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm mb-4" data-testid="text-type-prompt">
                What kind of memory would you like to add?
              </p>
              {memoryTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.type}
                    onClick={() => handleTypeSelect(option.type)}
                    className={`${option.bgClass} p-4 cursor-pointer transition-all hover:scale-[1.02] border-2 border-transparent hover:${option.borderClass}`}
                    data-testid={`option-type-${option.type}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {step === "content" && (
            <div className="space-y-5">
              {selectedType === "voiceMemo" ? (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <button
                      onClick={() => {
                        setIsRecording(!isRecording);
                        if (!isRecording) {
                          const interval = setInterval(() => {
                            setRecordingTime((t) => t + 1);
                          }, 1000);
                          setTimeout(() => clearInterval(interval), 60000);
                        }
                      }}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-red-500 animate-pulse"
                          : "bg-[hsl(var(--coral-dark))]"
                      }`}
                      data-testid="button-record"
                    >
                      <Mic className="w-8 h-8 text-white" />
                    </button>
                    <p className="mt-4 text-lg font-medium">
                      {isRecording ? "Recording..." : "Tap to record"}
                    </p>
                    {recordingTime > 0 && (
                      <p className="text-muted-foreground">
                        {Math.floor(recordingTime / 60)}:
                        {String(recordingTime % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">
                      Transcript (optional)
                    </Label>
                    <Textarea
                      placeholder="What did you say?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[100px] text-base rounded-xl"
                      data-testid="textarea-transcript"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">
                      {selectedType === "moment"
                        ? "What happened?"
                        : selectedType === "fromOthers"
                        ? "What did they say?"
                        : "What is it?"}
                    </Label>
                    <Textarea
                      placeholder="Write your memory here..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[120px] text-base rounded-xl"
                      data-testid="textarea-note"
                    />
                  </div>

                  {selectedType === "moment" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="w-4 h-4" />
                        AI suggestions
                      </div>
                      <div className="space-y-2">
                        {llmSuggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => setNote(suggestion)}
                            className="w-full text-left p-3 rounded-xl bg-muted/50 text-sm hover:bg-muted transition-colors"
                            data-testid={`suggestion-${i}`}
                          >
                            "{suggestion}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedType === "fromOthers" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">
                          Who said it?
                        </Label>
                        <Input
                          placeholder="e.g., Emma (classmate)"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="py-3 px-4 text-base rounded-xl"
                          data-testid="input-from"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">
                          Source (optional)
                        </Label>
                        <Input
                          placeholder="e.g., Birthday card"
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          className="py-3 px-4 text-base rounded-xl"
                          data-testid="input-source"
                        />
                      </div>
                    </>
                  )}

                  {selectedType === "keepsake" && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">
                        Type of keepsake
                      </Label>
                      <Input
                        placeholder="e.g., First drawing, Award"
                        value={keepsakeType}
                        onChange={(e) => setKeepsakeType(e.target.value)}
                        className="py-3 px-4 text-base rounded-xl"
                        data-testid="input-keepsake-type"
                      />
                    </div>
                  )}
                </>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full py-6 text-base rounded-xl"
                disabled={!note.trim()}
                data-testid="button-save-memory"
              >
                Save Memory
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
