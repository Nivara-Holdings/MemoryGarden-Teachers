import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sprout, ArrowLeft, Camera, Check } from "lucide-react";

type Screen = "welcome" | "signup" | "addChild";

export default function Welcome() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [childName, setChildName] = useState("");
  const [viewMode, setViewMode] = useState("device");

  const handleCreateGarden = () => {
    if (childName.trim()) {
      localStorage.setItem("childName", childName);
      localStorage.setItem("viewMode", viewMode);
      navigate("/garden");
    }
  };

  if (screen === "welcome") {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-background" style={{ maxWidth: "430px", margin: "0 auto" }}>
        <div className="flex-1 flex flex-col justify-center px-8 py-10">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[hsl(var(--sage-light))] flex items-center justify-center">
                <Sprout className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-normal mb-4 tracking-tight text-foreground">
              Memory Garden
            </h1>
            <p className="text-lg text-muted-foreground italic leading-relaxed">
              "So they never have to wonder."
            </p>
          </div>

          <div className="mt-auto space-y-4">
            <Button
              onClick={() => setScreen("signup")}
              className="w-full py-6 text-base rounded-xl"
              data-testid="button-get-started"
            >
              Get Started
            </Button>
            <p className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <span className="text-primary cursor-pointer hover:underline" data-testid="link-login">
                Log in
              </span>
            </p>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate("/child")}
              className="text-muted-foreground text-sm underline hover:text-foreground transition-colors"
              data-testid="link-child-demo"
            >
              View as child (demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "signup") {
    return (
      <div className="min-h-screen bg-background" style={{ maxWidth: "430px", margin: "0 auto" }}>
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border">
          <button
            onClick={() => setScreen("welcome")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg">Create Account</span>
          <div className="w-6" />
        </header>

        <div className="px-6 py-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Your name</Label>
            <Input
              type="text"
              placeholder="Enter your name"
              className="py-4 px-4 text-base rounded-xl border-border"
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Email</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              className="py-4 px-4 text-base rounded-xl border-border"
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Password</Label>
            <Input
              type="password"
              placeholder="Create a password"
              className="py-4 px-4 text-base rounded-xl border-border"
              data-testid="input-password"
            />
          </div>

          <Button
            onClick={() => setScreen("addChild")}
            className="w-full py-6 text-base rounded-xl mt-4"
            data-testid="button-continue"
          >
            Continue
          </Button>

          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <div className="flex-1 h-px bg-border" />
            <span>or sign up with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 py-5 rounded-xl"
              data-testid="button-google"
            >
              Google
            </Button>
            <Button
              variant="outline"
              className="flex-1 py-5 rounded-xl"
              data-testid="button-apple"
            >
              Apple
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "addChild") {
    const viewOptions = [
      { value: "device", label: "On my device", sublabel: "ages 7-12" },
      { value: "login", label: "Their own login", sublabel: "ages 13+" },
      { value: "future", label: "Not yet", sublabel: "I'm building for the future" },
    ];

    return (
      <div className="min-h-screen bg-background" style={{ maxWidth: "430px", margin: "0 auto" }}>
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border">
          <button
            onClick={() => setScreen("signup")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-child"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg">Add Child</span>
          <div className="w-6" />
        </header>

        <div className="px-6 py-8 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-[hsl(var(--sage-light))] border-2 border-dashed border-primary flex flex-col items-center justify-center cursor-pointer hover:bg-[hsl(var(--sage-light)/0.8)] transition-colors">
              <Camera className="w-6 h-6 text-primary mb-1" />
              <span className="text-xs text-primary">Add Photo</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Child's name</Label>
            <Input
              type="text"
              placeholder="Enter their name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="py-4 px-4 text-base rounded-xl border-border"
              data-testid="input-child-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Birthday</Label>
            <Input
              type="text"
              placeholder="MM / DD / YYYY"
              className="py-4 px-4 text-base rounded-xl border-border"
              data-testid="input-birthday"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground text-sm">
              How will they view their garden?
            </Label>
            <div className="space-y-3">
              {viewOptions.map((option) => (
                <Card
                  key={option.value}
                  onClick={() => setViewMode(option.value)}
                  className={`p-4 cursor-pointer transition-all ${
                    viewMode === option.value
                      ? "border-primary border-2 bg-[hsl(var(--sage-light)/0.3)]"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`option-${option.value}`}
                  role="radio"
                  aria-checked={viewMode === option.value}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        viewMode === option.value
                          ? "border-primary bg-primary"
                          : "border-primary"
                      }`}
                    >
                      {viewMode === option.value && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="text-base" data-testid={`text-option-label-${option.value}`}>{option.label}</div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-option-sublabel-${option.value}`}>
                        {option.sublabel}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreateGarden}
            className="w-full py-6 text-base rounded-xl mt-4"
            disabled={!childName.trim()}
            data-testid="button-create-garden"
          >
            Create Garden
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
