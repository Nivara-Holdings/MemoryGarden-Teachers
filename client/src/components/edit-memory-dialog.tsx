import { useState, useEffect } from "react";
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
import { Loader2, Sparkles, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Memory } from "@shared/schema";

interface EditMemoryDialogProps {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (memoryId: string, updates: { rawNote: string; refinedNote?: string | null; date?: string; from?: string }) => void;
  isSaving?: boolean;
  childName?: string;
}

function parseDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

export default function EditMemoryDialog({
  memory,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  childName,
}: EditMemoryDialogProps) {
  const [note, setNote] = useState("");
  const [refinedNote, setRefinedNote] = useState<string | null>(null);
  const [memoryDate, setMemoryDate] = useState("");
  const [from, setFrom] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishingStyle, setPolishingStyle] = useState<string | null>(null);

  useEffect(() => {
    if (memory) {
      setNote(memory.rawNote || "");
      setRefinedNote(memory.refinedNote || null);
      setMemoryDate(parseDisplayDate(memory.date));
      setFrom(memory.from || "Mom");
    }
  }, [memory]);

  const handlePolishNote = async (style: "fix" | "polish") => {
    if (!note.trim()) return;
    setIsPolishing(true);
    setPolishingStyle(style);
    try {
      const response = await apiRequest("POST", "/api/refine-note", { rawNote: note, childName, style });
      const data = await response.json();
      setRefinedNote(data.refinedNote);
    } catch (error) {
      console.error("Failed to polish note:", error);
    } finally {
      setIsPolishing(false);
      setPolishingStyle(null);
    }
  };

  const handleSave = () => {
    if (!memory || !note.trim()) return;
    const selectedDate = new Date(memoryDate + 'T00:00:00');
    const dateStr = selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    onSave(memory.id, {
      rawNote: note,
      refinedNote,
      date: dateStr,
      from,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNote("");
      setRefinedNote(null);
    }
    onOpenChange(newOpen);
  };

  if (!memory) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] p-0 gap-0 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle className="text-lg text-center">Edit Memory</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Note */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Your memory</Label>
            <Textarea
              placeholder="Write your memory here..."
              value={note}
              onChange={(e) => { setNote(e.target.value); setRefinedNote(null); }}
              className="min-h-[120px] text-base rounded-xl"
            />
          </div>

          {/* Polish buttons */}
          {note.trim() && (
            <div className="space-y-3">
              <Label className="text-muted-foreground text-sm">Refine your words</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => handlePolishNote("fix")} disabled={isPolishing}
                  className="flex-1 rounded-xl text-xs py-2 gap-1.5">
                  {polishingStyle === "fix" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Fix it</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => handlePolishNote("polish")} disabled={isPolishing}
                  className="flex-1 rounded-xl text-xs py-2 gap-1.5">
                  {polishingStyle === "polish" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Polish it</>}
                </Button>
              </div>

              {refinedNote && (
                <div className="p-4 rounded-xl bg-[hsl(var(--sage-light))] border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2">Refined version:</p>
                  <p className="italic text-foreground">"{refinedNote}"</p>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => { setNote(refinedNote); setRefinedNote(null); }}
                    className="mt-2">
                    Use this version
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* From */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Who is this from?</Label>
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Mom, Dad, Grandma..."
              className="py-3 px-4 text-base rounded-xl"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">When did this happen?</Label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="pl-10 py-3 text-base rounded-xl"
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!note.trim() || isSaving}
              className="text-sm font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground/40 transition-colors px-4 py-2"
            >
              {isSaving ? "Saving..." : "Save →"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
