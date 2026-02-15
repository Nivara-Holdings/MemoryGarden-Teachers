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
import MemoryCard from "@/components/memory-card";
import AddMemoryDialog from "@/components/add-memory-dialog";
import EditMemoryDialog from "@/components/edit-memory-dialog";
import StoryViewer from "@/components/story-viewer";
import { useAuth } from "@/hooks/use-auth";
import { Menu, LogOut, Plus, Sprout } from "lucide-react";
import type { Memory, InsertMemory, Child } from "@shared/schema";

const filterOptions = [
  { key: "all", label: "All", emoji: "🌿" },
  { key: "moment", label: "Moment", emoji: "💛" },
  { key: "first", label: "First", emoji: "⭐" },
  { key: "growth", label: "Growth", emoji: "🌱" },
  { key: "keepsake", label: "Keepsake", emoji: "🎨" },
];

export default function Garden() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/garden/:childId");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [storyData, setStoryData] = useState<{ memories: Memory[]; monthLabel: string; summary?: string } | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);
  const { user, logout } = useAuth();

  const { data: children = [], isLoading: loadingChildren } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const childId = params?.childId || children[0]?.id;
  const currentChild = children.find(c => c.id === childId);

  useEffect(() => {
    if (!loadingChildren && children.length === 0) {
      navigate("/");
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
      : memories.filter((m) => m.source?.toLowerCase().includes(activeFilter));

  // Group memories by month
  const groupedMemories = (() => {
    const memoriesToGroup = filteredMemories;
    
    const groups: { label: string; sortKey: string; memories: typeof memoriesToGroup }[] = [];
    const groupMap = new Map<string, typeof memoriesToGroup>();
    
    for (const memory of memoriesToGroup) {
      // Parse the date string (format: "Feb 12, 2026" or similar)
      const parsed = new Date(memory.date || memory.createdAt || "");
      let label: string;
      let sortKey: string;
      
      if (!isNaN(parsed.getTime())) {
        label = parsed.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        sortKey = `${parsed.getFullYear()}-${String(parsed.getMonth()).padStart(2, "0")}`;
      } else {
        label = "Other";
        sortKey = "0000-00";
      }
      
      if (!groupMap.has(sortKey)) {
        groupMap.set(sortKey, []);
        groups.push({ label, sortKey, memories: groupMap.get(sortKey)! });
      }
      groupMap.get(sortKey)!.push(memory);
    }
    
    // Sort groups newest first
    groups.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return groups;
  })();

  // Garden stats
  const firstMemoryDate = memories.length > 0
    ? memories[memories.length - 1]?.date || ""
    : "";

  const openStory = async (group: { label: string; sortKey: string; memories: Memory[] }) => {
    if (group.memories.length < 3) {
      setStoryData({ memories: group.memories, monthLabel: group.label });
      return;
    }
    // Generate summary with Claude
    setGeneratingSummary(group.sortKey);
    try {
      const notes = group.memories.map(m => m.refinedNote || m.rawNote).filter(Boolean).join(". ");
      const res = await apiRequest("POST", "/api/generate-story", {
        notes,
        childName: currentChild?.name,
        monthLabel: group.label,
      });
      const data = await res.json();
      setStoryData({ memories: group.memories, monthLabel: group.label, summary: data.summary });
    } catch (err) {
      setStoryData({ memories: group.memories, monthLabel: group.label });
    } finally {
      setGeneratingSummary(null);
    }
  };
  const daysSinceLastMemory = memories.length > 0
    ? (() => {
        const last = new Date(memories[0]?.createdAt || "");
        if (isNaN(last.getTime())) return null;
        const diff = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
      })()
    : null;

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
          onClick={() => navigate("/")}
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
            {memories.length} {memories.length === 1 ? "memory" : "memories"}
            {firstMemoryDate ? ` · Since ${firstMemoryDate}` : ""}
            {daysSinceLastMemory !== null && daysSinceLastMemory > 0 
              ? ` · Last added ${daysSinceLastMemory === 1 ? "yesterday" : `${daysSinceLastMemory} days ago`}` 
              : daysSinceLastMemory === 0 ? " · Added today" : ""}
          </p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {filterOptions.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground shadow-sm hover:bg-muted"
                }`}
                data-testid={`filter-${filter.key}`}
              >
                <span>{filter.emoji}</span>
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
              <div className="space-y-6">
                {groupedMemories.map((group) => (
                  <div key={group.sortKey}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <h2 className="text-sm font-medium text-muted-foreground tracking-wide">
                        {group.label}
                      </h2>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-4 pl-5 border-l-2 border-border/50 ml-[3px]">
                      {group.memories.map((memory) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onTogglePrivacy={handleTogglePrivacy}
                        />
                      ))}
                    </div>
                  </div>
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
        childNickname={(currentChild as any)?.nickname}
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

      {storyData && (
        <StoryViewer
          memories={storyData.memories}
          monthLabel={storyData.monthLabel}
          childName={currentChild?.name || ""}
          summary={storyData.summary}
          onClose={() => setStoryData(null)}
        />
      )}
    </div>
  );
}
