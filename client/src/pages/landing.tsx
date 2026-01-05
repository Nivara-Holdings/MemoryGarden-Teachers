import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-[430px] mx-auto">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-[hsl(var(--sage-light))] mx-auto flex items-center justify-center">
          <Sprout className="w-12 h-12 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-serif" data-testid="text-landing-title">
            Memory Garden
          </h1>
          <p className="text-muted-foreground" data-testid="text-landing-subtitle">
            A place to grow memories for the ones you love
          </p>
        </div>

        <p className="text-sm text-muted-foreground max-w-sm">
          Record moments, voice notes, and keepsakes. Let your children discover 
          them when they're ready.
        </p>

        <Button
          size="lg"
          className="w-full"
          onClick={() => window.location.href = "/api/login"}
          data-testid="button-login"
        >
          Sign in to start
        </Button>
      </div>
    </div>
  );
}
