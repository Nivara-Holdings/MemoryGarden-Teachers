import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, ArrowLeft, Loader2, Heart, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Screen = "home" | "login" | "signup";
type Role = "mom" | "dad" | "teacher";

export default function Landing() {
  const [screen, setScreen] = useState<Screen>("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      toast({ title: "Error", description: "Email and password are required", variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: "Error", description: "Please select your role", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (screen === "home") {
    return (
      <div className="min-h-screen flex flex-col bg-background max-w-[430px] mx-auto relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute top-[-60px] right-[-40px] w-48 h-48 rounded-full bg-[hsl(var(--sage-light))] opacity-40" />
        <div className="absolute bottom-[200px] left-[-60px] w-36 h-36 rounded-full bg-[hsl(var(--sage-light))] opacity-30" />

        <div className="flex-1 flex flex-col justify-center px-8 relative z-10">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--sage-light))] mx-auto mb-8 flex items-center justify-center">
              <Sprout className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-serif tracking-tight text-foreground mb-3">
              Memory Garden
            </h1>
            <p className="text-base text-primary/80 italic font-serif">
              So they never have to wonder.
            </p>
          </div>

          {/* Value props */}
          <div className="space-y-4 mb-12 max-w-[300px] mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">💛</span>
              <p className="text-sm text-muted-foreground">Capture everyday moments before they slip away</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">🌱</span>
              <p className="text-sm text-muted-foreground">Watch their story grow, month by month</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">⭐</span>
              <p className="text-sm text-muted-foreground">Give them a gift they'll treasure forever</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="px-8 pb-10 relative z-10 space-y-4">
          <Button 
            size="lg" 
            className="w-full py-6 text-base rounded-2xl shadow-md" 
            onClick={() => setScreen("signup")}
          >
            Get Started
          </Button>
          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <span 
              className="text-primary cursor-pointer hover:underline font-medium" 
              onClick={() => setScreen("login")}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="flex items-center gap-4 px-6 py-5">
          <button onClick={() => setScreen("home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <div className="px-8 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sprout className="w-5 h-5 text-primary" />
            <span className="font-serif text-primary text-sm">Memory Garden</span>
          </div>
          <h2 className="text-2xl font-serif mb-8">Welcome back</h2>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Password</Label>
              <Input type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} className="py-5 px-4 text-base rounded-xl" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <Button onClick={handleLogin} className="w-full py-6 text-base rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
            </Button>
            <p className="text-center text-muted-foreground text-sm pt-2">
              Don't have an account?{" "}
              <span className="text-primary cursor-pointer hover:underline font-medium" onClick={() => { setScreen("signup"); setEmail(""); setPassword(""); }}>
                Sign up
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "signup") {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="flex items-center gap-4 px-6 py-5">
          <button onClick={() => setScreen("home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <div className="px-8 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sprout className="w-5 h-5 text-primary" />
            <span className="font-serif text-primary text-sm">Memory Garden</span>
          </div>
          <h2 className="text-2xl font-serif mb-6">Create your garden</h2>
          
          <div className="space-y-5">
            {/* Role Picker */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">I am a...</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "mom" as Role, label: "Mom" },
                  { value: "dad" as Role, label: "Dad" },
                  { value: "teacher" as Role, label: "Teacher" },
                ]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRole(option.value)}
                    className={`py-3 rounded-xl border-2 transition-all ${
                      role === option.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className={`text-sm font-medium ${role === option.value ? "text-primary" : "text-foreground"}`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">First name</Label>
                <Input type="text" placeholder="First" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Last name</Label>
                <Input type="text" placeholder="Last" value={lastName} onChange={(e) => setLastName(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Password</Label>
              <Input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="py-5 px-4 text-base rounded-xl" onKeyDown={(e) => e.key === "Enter" && handleRegister()} />
            </div>
            <Button onClick={handleRegister} className="w-full py-6 text-base rounded-xl" disabled={isSubmitting || !role}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </Button>
            <p className="text-center text-muted-foreground text-sm pt-2">
              Already have an account?{" "}
              <span className="text-primary cursor-pointer hover:underline font-medium" onClick={() => { setScreen("login"); setEmail(""); setPassword(""); }}>
                Log in
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
