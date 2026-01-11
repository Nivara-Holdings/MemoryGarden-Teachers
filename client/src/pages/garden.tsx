import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MemoryCard, { FeaturedVoiceMemo } from "@/components/memory-card";
import AddMemoryDialog from "@/components/add-memory-dialog";
import EditMemoryDialog from "@/components/edit-memory-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Menu, LogOut, Plus, Sprout, Heart, Mic, MessageCircle, Award } from "lucide-react";
import type { Memory, InsertMemory, Child } from "@shared/schema";

const filterOptions = [
  { key: "all", label: "All", icon: Sprout },
  { key: "moment", label: "Moments", icon: Heart },
  { key: "voiceMemo", label: "Voice", icon: Mic },
  { key: "fromOthers", label: "Others", icon: MessageCircle },
  { key: "keepsake", label: "Keepsakes", icon: Award },
];

export default function Garden() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/garden/:childId");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const { user, logout } = useAuth();

  const { data: children = [], isLoading: loadingChildren } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const childId = params?.childId || children[0]?.id;
  const currentChild = children.find(c => c.id === childId);

  useEffect(() => {
    if (!loadingChildren && children.length === 0) {
      navigate("/add-child");
    }
  }, [loadingChildren, children, navigate]);

  const { data: memories = [], isLoading: loadingMemories } = useQuery<Memory[]>({
    queryKey: ["/api/memories", childId],
    enabled: !!childId,
  });

  const createMemoryMutation = useMutation({
    mutationFn: async (memory: Omit<InsertMemory, "parentId">) => {
      const response = await apiRequest("POST", "/api/memories", memory);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories", childId] });
    },
  });

  const updateMemoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertMemory> }) => {
      const response = await apiRequest("PATCH", `/api/memories/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories", childId] });
      setEditingMemory(null);
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/memories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories", childId] });
      setDeletingMemoryId(null);
    },
  });

  const handleEdit = (memory: Memory) => {
    setEditingMemory(memory);
  };

  const handleDelete = (memoryId: string) => {
    setDeletingMemoryId(memoryId);
  };

  const handleTogglePrivacy = (memoryId: string, shared: boolean) => {
    updateMemoryMutation.mutate({ id: memoryId, updates: { shared } });
  };

  const confirmDelete = () => {
    if (deletingMemoryId) {
      deleteMemoryMutation.mutate(deletingMemoryId);
    }
  };

  const filteredMemories =
    activeFilter === "all"
      ? memories
      : memories.filter((m) => m.type === activeFilter);

  const featuredVoiceMemo = memories.find((m) => m.type === "voiceMemo");

  if (loadingChildren) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sprout className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!childId) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ maxWidth: "430px", margin: "0 auto" }}
    >
      <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border sticky top-0 bg-background z-50">
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" />
        </div>
        <button
          onClick={() => logout()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="px-6 py-6">
        <div className="mb-5">
          <h1
            className="text-2xl font-normal mb-1 tracking-tight"
            data-testid="text-garden-title"
          >
            {currentChild?.name}'s Garden
          </h1>
          <p className="text-muted-foreground text-sm">
            {currentChild?.age ? `Age ${currentChild.age} • ` : ""}{memories.length} memories
          </p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {filterOptions.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground shadow-sm hover:bg-muted"
                }`}
                data-testid={`filter-${filter.key}`}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {loadingMemories ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <>
            {activeFilter === "all" && featuredVoiceMemo && (
              <div className="mb-4">
                <FeaturedVoiceMemo memory={featuredVoiceMemo} />
              </div>
            )}

            {filteredMemories.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Sprout className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No memories yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Start adding memories to grow your garden
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="rounded-xl"
                  data-testid="button-add-first-memory"
                >
                  Add First Memory
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMemories
                  .filter((m) =>
                    activeFilter === "all" && featuredVoiceMemo
                      ? m.id !== featuredVoiceMemo.id
                      : true
                  )
                  .map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTogglePrivacy={handleTogglePrivacy}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        <div className="h-24" />
      </div>

      <div className="fixed bottom-6 right-6 z-50" style={{ maxWidth: "430px" }}>
        <Button
          onClick={() => setShowAddDialog(true)}
          size="lg"
          className="w-14 h-14 rounded-full shadow-lg"
          data-testid="button-add-memory"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <AddMemoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={(memory) => createMemoryMutation.mutate(memory)}
        childId={childId}
        childName={currentChild?.name}
      />

      <EditMemoryDialog
        memory={editingMemory}
        open={!!editingMemory}
        onOpenChange={(open) => !open && setEditingMemory(null)}
        onSave={(id, updates) => updateMemoryMutation.mutate({ id, updates })}
        isSaving={updateMemoryMutation.isPending}
        childName={currentChild?.name}
      />

      <AlertDialog open={!!deletingMemoryId} onOpenChange={(open) => !open && setDeletingMemoryId(null)}>
        <AlertDialogContent className="max-w-[350px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This memory will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
