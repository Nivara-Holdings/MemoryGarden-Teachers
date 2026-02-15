import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Screen = "home" | "login" | "signup";

export default function Landing() {
  const [screen, setScreen] = useState<Screen>("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-[430px] mx-auto">
        <div className="text-center space-y-6 w-full">
          <div className="w-24 h-24 rounded-full bg-[hsl(var(--sage-light))] mx-auto flex items-center justify-center">
            <Sprout className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-serif">Memory Garden</h1>
            <p className="text-lg text-muted-foreground italic">"So they never have to wonder."</p>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Record moments, voice notes, and keepsakes. Let your children discover them when they're ready.
          </p>
          <div className="space-y-3 pt-4">
            <Button size="lg" className="w-full py-6 text-base rounded-xl" onClick={() => setScreen("signup")}>
              Get Started
            </Button>
            <p className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <span className="text-primary cursor-pointer hover:underline" onClick={() => setScreen("login")}>
                Log in
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border">
          <button onClick={() => setScreen("home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg">Log In</span>
          <div className="w-6" />
        </header>
        <div className="px-6 py-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Email</Label>
            <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="py-4 px-4 text-base rounded-xl border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Password</Label>
            <Input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="py-4 px-4 text-base rounded-xl border-border" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <Button onClick={handleLogin} className="w-full py-6 text-base rounded-xl mt-4" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
          </Button>
          <p className="text-center text-muted-foreground text-sm">
            Don't have an account?{" "}
            <span className="text-primary cursor-pointer hover:underline" onClick={() => { setScreen("signup"); setEmail(""); setPassword(""); }}>
              Sign up
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (screen === "signup") {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border">
          <button onClick={() => setScreen("home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg">Create Account</span>
          <div className="w-6" />
        </header>
        <div className="px-6 py-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">First name</Label>
            <Input type="text" placeholder="Enter your first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="py-4 px-4 text-base rounded-xl border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Last name</Label>
            <Input type="text" placeholder="Enter your last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="py-4 px-4 text-base rounded-xl border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Email</Label>
            <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="py-4 px-4 text-base rounded-xl border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Password</Label>
            <Input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="py-4 px-4 text-base rounded-xl border-border" onKeyDown={(e) => e.key === "Enter" && handleRegister()} />
          </div>
          <Button onClick={handleRegister} className="w-full py-6 text-base rounded-xl mt-4" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </Button>
          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <span className="text-primary cursor-pointer hover:underline" onClick={() => { setScreen("login"); setEmail(""); setPassword(""); }}>
              Log in
            </span>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
