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
import { Loader2 } from "lucide-react";
import type { Memory } from "@shared/schema";

interface EditMemoryDialogProps {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (memoryId: string, updates: { rawNote: string; refinedNote?: string | null }) => void;
  isSaving?: boolean;
}

export default function EditMemoryDialog({
  memory,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: EditMemoryDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (memory) {
      setNote(memory.refinedNote || memory.rawNote);
    }
  }, [memory]);

  const handleSave = () => {
    if (!memory || !note.trim()) return;
    onSave(memory.id, { 
      rawNote: note,
      refinedNote: null,
    });
  };

  if (!memory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[150px] text-base rounded-xl"
              data-testid="textarea-edit-note"
            />
          </div>

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
