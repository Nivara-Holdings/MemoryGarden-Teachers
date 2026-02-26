import { useState, useRef, useEffect } from "react";
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
import { Mic, Image, Loader2, Calendar, Square, Sparkles, ScanText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { InsertMemory } from "@shared/schema";

interface AddMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (memory: Omit<InsertMemory, "parentId">) => void;
  childId: string;
  childName?: string;
  childNickname?: string;
  userRole?: string | null;
}

const categories = [
  { key: "moment", emoji: "💛", label: "Moment" },
  { key: "first", emoji: "⭐", label: "First" },
  { key: "growth", emoji: "🌱", label: "Growth" },
  { key: "keepsake", emoji: "🎨", label: "Keepsake" },
];

export default function AddMemoryDialog({ open, onOpenChange, onSubmit, childId, childName, childNickname, userRole }: AddMemoryDialogProps) {
  const isTeacher = userRole === "teacher";
  const defaultFrom = isTeacher ? "Teacher" : userRole === "dad" ? "Dad" : "Mom";

  const [note, setNote] = useState("");
  const [refinedNote, setRefinedNote] = useState("");
  const [category, setCategory] = useState("moment");
  const [from, setFrom] = useState(defaultFrom);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishingStyle, setPolishingStyle] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [memoryDate, setMemoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveVoice, setSaveVoice] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReadingPhotos, setIsReadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetState = () => {
    setNote(""); setRefinedNote(""); setCategory("moment"); setFrom(defaultFrom);
    setIsRecording(false); setRecordingTime(0); setMediaUrls([]);
    setMemoryDate(new Date().toISOString().split('T')[0]);
    setIsTranscribing(false); setSaveVoice(true); setAudioUrl(null); setPolishingStyle(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") { try { mediaRecorderRef.current.stop(); } catch (e) {} }
    audioChunksRef.current = [];
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (saveVoice) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size > 0) {
            try {
              const urlResponse = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: "voice-memo.webm", size: audioBlob.size, contentType: "audio/webm" }) });
              if (urlResponse.ok) {
                const { uploadURL, objectPath } = await urlResponse.json();
                await fetch(uploadURL, { method: "PUT", body: audioBlob, headers: { "Content-Type": "audio/webm" } });
                setAudioUrl(objectPath);
              }
            } catch (err) { console.error("Audio upload failed:", err); }
          }
        }
      };
      mediaRecorder.start();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";
        recognitionRef.current = recognition;
        let finalTranscript = "";
        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
            else interim += event.results[i][0].transcript;
          }
          setNote((finalTranscript + interim).trim());
        };
        recognition.onerror = (event: any) => { if (event.error === "no-speech") { try { recognition.start(); } catch (e) {} } };
        recognition.onend = () => { if (isRecording && mediaRecorderRef.current?.state === "recording") { try { recognition.start(); } catch (e) {} } };
        recognition.start();
        setIsTranscribing(true);
      }

      setRecordingTime(0);
      timerRef.current = setInterval(() => { setRecordingTime((t) => { if (t >= 120) { stopRecording(); return t; } return t + 1; }); }, 1000);
      setIsRecording(true);
    } catch (err) { alert("Could not access microphone. Please allow microphone access."); }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} setIsTranscribing(false); }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handlePolishNote = async (style: "fix" | "polish") => {
    if (!note.trim()) return;
    setIsPolishing(true); setPolishingStyle(style);
    try {
      const response = await apiRequest("POST", "/api/refine-note", { rawNote: note, childName, childNickname, style });
      const data = await response.json();
      setRefinedNote(data.refinedNote);
    } catch (error) { console.error("Failed to polish note:", error); }
    finally { setIsPolishing(false); setPolishingStyle(null); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const urlResponse = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) });
        if (!urlResponse.ok) throw new Error("Failed");
        const { uploadURL, objectPath } = await urlResponse.json();
        await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        setMediaUrls(prev => [...prev, objectPath]);
      }
    } catch (error) { console.error("Upload failed:", error); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleReadPhotos = async () => {
    if (mediaUrls.length === 0) return;
    setIsReadingPhotos(true);
    try {
      const response = await fetch("/api/read-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrls: mediaUrls, childName, childNickname }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to read photos.");
        return;
      }
      if (data.generatedNote) {
        setNote(data.generatedNote);
        setCategory("keepsake");
      }
    } catch (error) {
      console.error("Read photos error:", error);
      alert("Failed to read photos. Check your connection and try again.");
    } finally {
      setIsReadingPhotos(false);
    }
  };

  const handleSubmit = () => {
    const selectedDate = new Date(memoryDate + 'T00:00:00');
    const dateStr = selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const finalMediaUrl = mediaUrls.length > 0 ? mediaUrls.join(",") : audioUrl;
    const finalMediaType = mediaUrls.length > 0 ? "image" : audioUrl ? "audio" : null;
    const selectedCat = categories.find(c => c.key === category);

    onSubmit({
      type: category === "keepsake" ? "keepsake" : "moment",
      rawNote: note, refinedNote: refinedNote || null, date: dateStr, shared: true, from, childId,
      mediaUrl: finalMediaUrl, mediaType: finalMediaType,
      source: isTeacher ? "teacher" : (selectedCat ? `${selectedCat.emoji} ${selectedCat.label}` : null),
      ...(audioUrl && { duration: `${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, "0")}` }),
    });
    resetState();
    onOpenChange(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-[400px] p-0 gap-0 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle className="text-lg text-center">{isTeacher ? "Add a Note" : "Add a Memory"}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">

          {/* Category circles — parents only */}
          {!isTeacher && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">What kind of memory?</Label>
            <div className="flex justify-between">
              {categories.map((cat) => (
                <button key={cat.key} onClick={() => setCategory(cat.key)} className="flex flex-col items-center gap-1.5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                    category === cat.key
                      ? "ring-2 ring-primary ring-offset-2 scale-110 bg-muted"
                      : "bg-muted/40 opacity-50 hover:opacity-80"
                  }`}>
                    {cat.emoji}
                  </div>
                  <span className={`text-[11px] ${category === cat.key ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* What happened + mic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-sm">What happened?</Label>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                  isRecording
                    ? "bg-red-50 border border-red-300 text-red-600"
                    : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {isRecording ? (
                  <><Square className="w-3 h-3" /> {formatTime(recordingTime)}</>
                ) : (
                  <><Mic className="w-3.5 h-3.5" /> Speak</>
                )}
              </button>
            </div>
            {isTranscribing && (
              <span className="text-xs text-primary animate-pulse">Listening...</span>
            )}
            <Textarea
              placeholder="Write your memory here..."
              value={note}
              onChange={(e) => { setNote(e.target.value); setRefinedNote(""); }}
              className="min-h-[120px] text-base rounded-xl"
            />
          </div>

          {/* Save voice toggle */}
          {recordingTime > 0 && !isRecording && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div>
                <p className="text-sm font-medium">Save voice recording</p>
                <p className="text-xs text-muted-foreground">Let your child hear your voice someday</p>
              </div>
              <button onClick={() => setSaveVoice(!saveVoice)}
                className={`w-11 h-6 rounded-full transition-colors relative ${saveVoice ? "bg-primary" : "bg-gray-300"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${saveVoice ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
          )}

          {/* AI Polish buttons */}
          {note.trim() && (
            <div className="space-y-3">
              <Label className="text-muted-foreground text-sm">Refine your words</Label>
              {note.trim().length < 30 && (
                <p className="text-xs text-muted-foreground italic">
                  Tip: a few more details will help the polish shine
                </p>
              )}
              <div className="flex gap-2">
                {!isTeacher && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePolishNote("fix")}
                  disabled={isPolishing}
                  className="flex-1 rounded-xl text-xs py-2 gap-1.5"
                >
                  {polishingStyle === "fix" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Fix it</>
                  )}
                </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePolishNote("polish")}
                  disabled={isPolishing}
                  className="flex-1 rounded-xl text-xs py-2 gap-1.5"
                >
                  {polishingStyle === "polish" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Polish it</>
                  )}
                </Button>
              </div>

              {refinedNote && (
                <div className="p-4 rounded-xl bg-[hsl(var(--sage-light))] border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2">Refined version:</p>
                  <p className="italic text-foreground">"{refinedNote}"</p>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => { setNote(refinedNote); setRefinedNote(""); }}
                    className="mt-2">
                    Use this version
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Photo upload */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Add photos (optional)</Label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />

            {mediaUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setMediaUrls(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">×</button>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full rounded-xl">
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : mediaUrls.length > 0 ? (
                <><Image className="w-4 h-4 mr-2" />Add more photos</>
              ) : (
                <><Image className="w-4 h-4 mr-2" />Choose photos</>
              )}
            </Button>

            {mediaUrls.length > 0 && (
              <Button type="button" variant="outline"
                onClick={handleReadPhotos}
                disabled={isReadingPhotos}
                className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
                {isReadingPhotos ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reading photos...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />{note.trim() ? "Re-read photos" : "Create note from photos"}</>
                )}
              </Button>
            )}
          </div>

          {/* Who is this from — parents only */}
          {!isTeacher && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Who is this from?</Label>
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Mom, Dad, Grandma..."
              className="py-3 px-4 text-base rounded-xl"
            />
          </div>
          )}

          {/* When */}
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
              onClick={handleSubmit}
              disabled={!note.trim() || isRecording}
              className="text-sm font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground/40 transition-colors px-4 py-2"
            >
              Save →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
