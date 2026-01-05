import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MemoryCard, { FeaturedVoiceMemo } from "@/components/memory-card";
import AddMemoryDialog from "@/components/add-memory-dialog";
import { Menu, User, Plus, Sprout, Heart, Mic, MessageCircle, Award } from "lucide-react";
import type { Memory, InsertMemory } from "@shared/schema";

const filterOptions = [
  { key: "all", label: "All", icon: Sprout },
  { key: "moment", label: "Moments", icon: Heart },
  { key: "voiceMemo", label: "Voice", icon: Mic },
  { key: "fromOthers", label: "Others", icon: MessageCircle },
  { key: "keepsake", label: "Keepsakes", icon: Award },
];

export default function Garden() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const childName = localStorage.getItem("childName") || "Your Child";
  const childId = "default-child";

  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ["/api/memories", childId],
  });

  const createMemoryMutation = useMutation({
    mutationFn: async (memory: InsertMemory) => {
      const response = await apiRequest("POST", "/api/memories", memory);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories", childId] });
    },
  });

  const filteredMemories =
    activeFilter === "all"
      ? memories
      : memories.filter((m) => m.type === activeFilter);

  const featuredVoiceMemo = memories.find((m) => m.type === "voiceMemo");

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
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-profile"
        >
          <User className="w-6 h-6" />
        </button>
      </header>

      <div className="px-6 py-6">
        <div className="mb-5">
          <h1
            className="text-2xl font-normal mb-1 tracking-tight"
            data-testid="text-garden-title"
          >
            {childName}'s Garden
          </h1>
          <p className="text-muted-foreground text-sm">
            Age 11 • {memories.length} memories
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

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <>
            {activeFilter === "all" && featuredVoiceMemo && (
              <FeaturedVoiceMemo memory={featuredVoiceMemo} />
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
              <div className="space-y-0">
                {filteredMemories
                  .filter((m) =>
                    activeFilter === "all" && featuredVoiceMemo
                      ? m.id !== featuredVoiceMemo.id
                      : true
                  )
                  .map((memory) => (
                    <MemoryCard key={memory.id} memory={memory} />
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
      />
    </div>
  );
}
