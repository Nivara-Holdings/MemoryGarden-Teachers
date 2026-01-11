import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Memory } from "@shared/schema";

interface EditMemoryDialogProps {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (memoryId: string, updates: { rawNote: string; refinedNote?: string | null }) => void;
  isSaving?: boolean;
  childName?: string;
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
  const [isPolishing, setIsPolishing] = useState(false);

  useEffect(() => {
    if (memory) {
      setNote(memory.rawNote || "");
      setRefinedNote(memory.refinedNote || null);
    }
  }, [memory]);

  const handlePolishNote = async () => {
    if (!note.trim()) return;
    
    setIsPolishing(true);
    try {
      const response = await apiRequest("POST", "/api/refine-note", {
        rawNote: note,
        childName,
      });
      const data = await response.json();
      setRefinedNote(data.refinedNote);
    } catch (error) {
      console.error("Failed to polish note:", error);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = () => {
    if (!memory || !note.trim()) return;
    onSave(memory.id, { 
      rawNote: note,
      refinedNote: refinedNote,
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
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg" data-testid="text-edit-dialog-title">
            Edit Memory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">
              Your memory
            </Label>
            <Textarea
              placeholder="Write your memory here..."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setRefinedNote(null);
              }}
              className="min-h-[120px] text-base rounded-xl"
              data-testid="textarea-edit-note"
            />
          </div>

          {note.trim() && (
            <Button
              variant="outline"
              onClick={handlePolishNote}
              disabled={isPolishing}
              className="w-full rounded-xl"
              data-testid="button-polish-edit"
            >
              {isPolishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Polishing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Polish my words
                </>
              )}
            </Button>
          )}

          {refinedNote && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Polished version
              </Label>
              <div className="p-4 bg-muted rounded-xl text-sm leading-relaxed" data-testid="text-refined-note">
                {refinedNote}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            className="w-full py-6 text-base rounded-xl"
            disabled={!note.trim() || isSaving}
            data-testid="button-save-edit"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
