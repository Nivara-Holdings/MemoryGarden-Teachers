import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Loader2, Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Child } from "@shared/schema";

export default function TeacherDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childBirthday, setChildBirthday] = useState("");
  const [childAge, setChildAge] = useState("");

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/teacher/children", {
        name: childName.trim(),
        parentEmail: parentEmail.trim().toLowerCase(),
        birthday: childBirthday || null,
        age: childAge ? parseInt(childAge) : null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setShowAddChild(false);
      setChildName("");
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
        <h1 className="text-3xl font-serif mb-1">Hi, {firstName}</h1>
        <p className="text-muted-foreground text-sm">
          {children.length === 0 ? "Add your students to start planting memories" : "Pick a garden to add a memory"}
        </p>
      </div>

      {/* Children profiles — identical layout to parent home */}
      <div className="px-6 py-8">
        <div className="flex items-start justify-center gap-10 flex-wrap">
          {children.map((child) => {
            const initial = child.name.charAt(0).toUpperCase();
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
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{child.name}</p>
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
        </div>
      </div>

      {/* Add Student Dialog — only difference from parent */}
      <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Child's Name</Label>
              <Input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Emma"
                className="rounded-xl"
              />
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
              disabled={!childName.trim() || !parentEmail.trim() || addChildMutation.isPending}
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
    </div>
  );
}
