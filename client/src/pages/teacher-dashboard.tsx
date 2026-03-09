import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Loader2, Sprout, FileSpreadsheet, Upload, Pencil, Camera } from "lucide-react";
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
import type { Child } from "@shared/schema";

export default function TeacherDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [showAddChild, setShowAddChild] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<{
    created: number; linked: number; skipped: number; errors: string[];
  } | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showDeleteChild, setShowDeleteChild] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editChildName, setEditChildName] = useState("");
  const [editChildNickname, setEditChildNickname] = useState("");
  const [editChildBirthday, setEditChildBirthday] = useState("");
  const [uploadingChildId, setUploadingChildId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childBirthday, setChildBirthday] = useState("");
  const [childAge, setChildAge] = useState("");

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/teacher/children", {
        name: childFirstName.trim(),
        parentEmail: parentEmail.trim().toLowerCase(),
        birthday: childBirthday || null,
        age: childAge ? parseInt(childAge) : null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setShowAddChild(false);
      setChildFirstName("");
      setChildLastName("");
      setParentEmail("");
      setChildBirthday("");
      setChildAge("");
      toast({
        title: "Child added",
        description: data.parentLinked
          ? `${data.name} has been linked to an existing parent account.`
          : `${data.name} added. The parent will be linked when they sign up.`,
      });
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

  const deleteChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      await apiRequest("DELETE", `/api/teacher/children/${childId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setEditingChild(null);
      setShowDeleteChild(false);
      toast({ title: "Student removed from your list" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile) throw new Error("No file selected");
      const text = await csvFile.text();
      const res = await apiRequest("POST", "/api/teacher/children/bulk", { csvContent: text });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setBulkResults(data);
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim() || null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowEditProfile(false);
      toast({ title: "Profile updated", description: "Your name has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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
      toast({ title: "Error", description: "Photo upload failed", variant: "destructive" });
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

  const openEditChild = (child: Child, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChild(child);
    setEditChildName(child.name);
    setEditChildNickname((child as any).nickname || "");
    setEditChildBirthday(child.birthday || "");
  };

  const handleSaveChildEdit = () => {
    if (!editingChild || !editChildName.trim()) return;
    updateChildMutation.mutate({
      id: editingChild.id,
      updates: {
        name: editChildName.trim(),
        nickname: editChildNickname.trim() || null,
        birthday: editChildBirthday || null,
      },
    });
  };

  const openEditProfile = () => {
    setEditFirstName(user?.firstName || "");
    setEditLastName(user?.lastName || "");
    setShowEditProfile(true);
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
      {/* Warm header area — identical to parent home */}
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
        <h1 className="text-3xl font-serif mb-1">
          Hi, {firstName}
          <button
            onClick={openEditProfile}
            className="inline-flex ml-2 text-muted-foreground hover:text-primary transition-colors align-middle"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </h1>
        <p className="text-muted-foreground text-sm">
          {children.length === 0 ? "Add your students to start planting memories" : "Pick a garden to add a memory"}
        </p>
      </div>

      {/* Children profiles — identical layout to parent home */}
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
                    onClick={(e) => openEditChild(child, e)}
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

          {/* Add new child — same dashed circle */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setShowAddChild(true)}
              className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-7 h-7 text-muted-foreground/50" />
            </button>
            <p className="text-sm text-muted-foreground">Add student</p>
          </div>

          {/* Bulk add via CSV */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => { setShowBulkUpload(true); setCsvFile(null); setBulkResults(null); }}
              className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
            >
              <FileSpreadsheet className="w-7 h-7 text-muted-foreground/50" />
            </button>
            <p className="text-sm text-muted-foreground">Bulk add</p>
          </div>
        </div>
      </div>

      {/* Add Student Dialog — only difference from parent */}
      <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                  placeholder="e.g. Emma"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={childLastName}
                  onChange={(e) => setChildLastName(e.target.value)}
                  placeholder="e.g. Smith"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent's Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                If the parent already has an account, the child links automatically. Otherwise, it links when they sign up.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="e.g. 5"
                  className="rounded-xl"
                  min="0"
                  max="18"
                />
              </div>
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Input
                  type="date"
                  value={childBirthday}
                  onChange={(e) => setChildBirthday(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <Button
              onClick={() => addChildMutation.mutate()}
              disabled={!childFirstName.trim() || !parentEmail.trim() || addChildMutation.isPending}
              className="w-full rounded-xl"
            >
              {addChildMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                "Add Student"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Your first name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Your last name"
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={!editFirstName.trim() || updateProfileMutation.isPending}
              className="w-full rounded-xl"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                value={editChildName}
                onChange={(e) => setEditChildName(e.target.value)}
                placeholder="Their first name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nickname</Label>
              <Input
                value={editChildNickname}
                onChange={(e) => setEditChildNickname(e.target.value)}
                placeholder="What do you call them? e.g. bug, sunshine"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Used by AI when writing memory notes</p>
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input
                type="date"
                value={editChildBirthday}
                onChange={(e) => setEditChildBirthday(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleSaveChildEdit}
              disabled={!editChildName.trim() || updateChildMutation.isPending}
              className="w-full rounded-xl"
            >
              {updateChildMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <button
              onClick={() => setShowDeleteChild(true)}
              className="w-full text-sm text-destructive hover:underline pt-1"
            >
              Remove this student
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Child Confirmation */}
      <AlertDialog open={showDeleteChild} onOpenChange={setShowDeleteChild}>
        <AlertDialogContent className="max-w-[380px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remove student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink {editingChild?.name} from your list. The student's profile and memories from their parent will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingChild && deleteChildMutation.mutate(editingChild.id)}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              {deleteChildMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
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
              This will remove your account and unlink you from all students. Student profiles will remain with their parents.
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

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={(open) => { if (!open) { setShowBulkUpload(false); setBulkResults(null); } }}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Bulk Add Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!bulkResults ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with columns: <strong>first name</strong>, <strong>last name</strong>, <strong>parent emails</strong>, and optionally <strong>age</strong> and <strong>birthday</strong>. For two parents, separate emails with a comma (e.g. <em>"mom@email.com, dad@email.com"</em>).
                </p>
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {csvFile ? csvFile.name : "Click to select CSV file"}
                    </p>
                  </label>
                </div>
                <Button
                  onClick={() => bulkUploadMutation.mutate()}
                  disabled={!csvFile || bulkUploadMutation.isPending}
                  className="w-full rounded-xl"
                >
                  {bulkUploadMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    "Upload & Add Students"
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-primary/5 rounded-xl p-4 space-y-1">
                  <p className="text-sm"><strong>{bulkResults.created}</strong> students added</p>
                  <p className="text-sm"><strong>{bulkResults.linked}</strong> linked to existing parents</p>
                  {bulkResults.skipped > 0 && (
                    <p className="text-sm text-amber-600"><strong>{bulkResults.skipped}</strong> skipped</p>
                  )}
                </div>
                {bulkResults.errors.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {bulkResults.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
                <Button onClick={() => { setShowBulkUpload(false); setBulkResults(null); }} className="w-full rounded-xl">
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
