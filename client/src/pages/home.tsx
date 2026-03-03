import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, LogOut, Loader2, Camera, Pencil, Sprout, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Child } from "@shared/schema";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [uploadingChildId, setUploadingChildId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [deletingChild, setDeletingChild] = useState<Child | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const { toast } = useToast();

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/children/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setEditingChild(null);
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      await apiRequest("DELETE", `/api/children/${childId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setDeletingChild(null);
      toast({ title: "Profile deleted", description: "The profile and all associated memories have been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/auth/account");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingChildId) return;
    try {
      const urlResponse = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlResponse.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlResponse.json();
      const uploadRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadRes.ok) throw new Error("File upload failed");
      await apiRequest("PATCH", `/api/children/${uploadingChildId}`, { profilePhoto: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingChildId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerPhotoUpload = (childId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadingChildId(childId);
    fileInputRef.current?.click();
  };

  const openEditDialog = (child: Child, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChild(child);
    setEditName(child.name);
    setEditNickname((child as any).nickname || "");
    setEditBirthday(child.birthday || "");
  };

  const handleSaveEdit = () => {
    if (!editingChild || !editName.trim()) return;
    updateChildMutation.mutate({
      id: editingChild.id,
      updates: {
        name: editName.trim(),
        nickname: editNickname.trim() || null,
        birthday: editBirthday || null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = user?.firstName || "there";

  return (
    <div className="min-h-screen bg-background" style={{ maxWidth: "430px", margin: "0 auto" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Warm header area */}
      <div className="bg-gradient-to-b from-[hsl(var(--sage-light))] to-background px-6 pt-10 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--sage-light))] flex items-center justify-center">
              <Sprout className="w-4 h-4 text-primary" />
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <h1 className="text-3xl font-serif mb-1">Hi, {firstName}</h1>
        <p className="text-muted-foreground text-sm">
          {children.length === 0 ? "Plant your first garden to get started" : "Pick a garden to add a memory"}
        </p>
      </div>

      {/* Children profiles */}
      <div className="px-6 py-8">
        <div className="flex items-start justify-center gap-10 flex-wrap">
          {children.map((child) => {
            const initial = child.name.charAt(0).toUpperCase();
            const nickname = (child as any).nickname;
            return (
              <div key={child.id} className="flex flex-col items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => navigate(`/garden/${child.id}`)}
                    className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-primary/20 hover:border-primary transition-all hover:shadow-lg focus:outline-none"
                  >
                    {child.profilePhoto ? (
                      <img
                        src={child.profilePhoto}
                        alt={child.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/25 flex items-center justify-center">
                        <span className="text-3xl font-serif text-primary">{initial}</span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={(e) => triggerPhotoUpload(child.id, e)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={(e) => openEditDialog(child, e)}
                    className="group flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <p className="text-sm font-medium">{child.name}</p>
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  {nickname && (
                    <p className="text-xs text-muted-foreground italic">"{nickname}"</p>
                  )}
                  {child.age && (
                    <p className="text-xs text-muted-foreground">Age {child.age}</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add new child */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => navigate("/add-child")}
              className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-7 h-7 text-muted-foreground/50" />
            </button>
            <p className="text-sm text-muted-foreground">Add child</p>
          </div>
        </div>
      </div>

      {/* Edit Child Dialog */}
      <Dialog open={!!editingChild} onOpenChange={(open) => !open && setEditingChild(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Their first name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nickname</Label>
              <Input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder="What do you call them? e.g. bug, sunshine"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Used by AI when writing memory notes</p>
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input
                type="date"
                value={editBirthday}
                onChange={(e) => setEditBirthday(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateChildMutation.isPending}
              className="w-full rounded-xl"
            >
              {updateChildMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                onClick={() => { setEditingChild(null); setDeletingChild(editingChild); }}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl text-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete this profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Child Confirmation */}
      <AlertDialog open={!!deletingChild} onOpenChange={(open) => !open && setDeletingChild(null)}>
        <AlertDialogContent className="max-w-[380px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete {deletingChild?.name}'s profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all memories, photos, and data for {deletingChild?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingChild && deleteChildMutation.mutate(deletingChild.id)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChildMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <AlertDialogContent className="max-w-[380px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all your children's profiles, and all memories. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountMutation.mutate()}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete account link */}
      <div className="px-6 pb-8 text-center">
        <button
          onClick={() => setShowDeleteAccount(true)}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}
