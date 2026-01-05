import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AddChild() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");

  const createChild = useMutation({
    mutationFn: async (data: { name: string; birthday?: string }) => {
      const res = await apiRequest("POST", "/api/children", data);
      return res.json();
    },
    onSuccess: (child) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({ title: "Garden created", description: `${child.name}'s garden is ready` });
      navigate(`/garden/${child.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create garden", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createChild.mutate({ name: name.trim(), birthday: birthday || undefined });
  };

  return (
    <div className="min-h-screen p-4 max-w-[430px] mx-auto">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-[hsl(var(--sage-light))] mx-auto mb-4 flex items-center justify-center">
          <Sprout className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-serif" data-testid="text-add-child-title">
          Plant a new garden
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Create a memory garden for someone special
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Child's details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Their first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-child-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday (optional)</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                data-testid="input-child-birthday"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!name.trim() || createChild.isPending}
              data-testid="button-create-garden"
            >
              {createChild.isPending ? "Creating..." : "Create garden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
