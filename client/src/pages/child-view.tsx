import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import MemoryCard from "@/components/memory-card";
import { ArrowLeft, Sprout, Heart, Mic, MessageCircle, Award } from "lucide-react";
import type { Memory } from "@shared/schema";

const filterOptions = [
  { key: "all", label: "All", icon: Sprout },
  { key: "moment", label: "Moments", icon: Heart },
  { key: "voiceMemo", label: "Voice", icon: Mic },
  { key: "fromOthers", label: "Others", icon: MessageCircle },
  { key: "keepsake", label: "Keepsakes", icon: Award },
];

export default function ChildView() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");

  const childName = localStorage.getItem("childName") || "Your";
  const childId = "default-child";

  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ["/api/memories", childId],
  });

  const filteredMemories =
    activeFilter === "all"
      ? memories
      : memories.filter((m) => m.type === activeFilter);

  return (
    <div
      className="min-h-screen bg-background"
      style={{ maxWidth: "430px", margin: "0 auto" }}
    >
      <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border sticky top-0 bg-background z-50">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" />
          <span className="text-lg font-normal">My Garden</span>
        </div>
        <div className="w-6" />
      </header>

      <div className="px-6 py-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[hsl(var(--sage-light))] mx-auto mb-4 flex items-center justify-center">
            <Sprout className="w-10 h-10 text-primary" />
          </div>
          <h1
            className="text-2xl font-normal mb-2"
            data-testid="text-child-title"
          >
            {childName}'s Garden
          </h1>
          <p className="text-muted-foreground italic" data-testid="text-child-subtitle">
            A collection of love and memories
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
                data-testid={`child-filter-${filter.key}`}
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
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <Sprout className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">Your garden is growing</h3>
            <p className="text-muted-foreground text-sm" data-testid="text-empty-message">
              Memories will appear here as they're added
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredMemories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} isChildView />
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
