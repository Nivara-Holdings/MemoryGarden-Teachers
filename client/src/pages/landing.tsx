import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, ArrowLeft, Loader2, Heart, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Screen = "home" | "choose-path" | "login" | "signup" | "forgot-password";
type Role = "parent" | "organization";

const sampleMemories = [
  { quote: "She shared her snack with the new kid today. Nobody asked her to.", from: "Ms. Rivera", role: "Teacher" },
  { quote: "He fell off the monkey bars, got back up, and said 'I'm gonna try again.'", from: "Coach Dan", role: "Coach" },
  { quote: "She made her little brother laugh so hard at dinner he couldn't breathe.", from: "Mom", role: "Mom" },
];

export default function Landing() {
  const [screen, setScreen] = useState<Screen>("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [parentType, setParentType] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (screen !== "home") return;
    const timer = setInterval(() => {
      setMemoryIndex((i) => (i + 1) % sampleMemories.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [screen]);

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
        body: JSON.stringify({ email, password, firstName, lastName, role: role === "parent" ? parentType : role, schoolName: role === "organization" ? schoolName : undefined }),
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

  const handleResetPassword = async () => {
    if (!email) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Reset failed");
      }
      setResetSuccess(true);
      toast({ title: "Password updated", description: "You can now log in with your new password." });
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (screen === "home") {
    return (
      <div className="min-h-screen flex flex-col bg-background max-w-[430px] mx-auto">
        <div className="flex-1 flex flex-col justify-center px-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-[hsl(var(--sage-light))] mx-auto mb-4 flex items-center justify-center">
              <Sprout className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-serif tracking-tight text-foreground">
              Memory Garden
            </h1>
          </div>

          {/* Rotating memory */}
          <div className="mb-6 min-h-[140px] flex items-center">
            <div key={memoryIndex} className="w-full text-center animate-in fade-in duration-500">
              <p className="text-lg font-serif text-foreground leading-relaxed italic mb-4 px-2">
                "{sampleMemories[memoryIndex].quote}"
              </p>
              <p className="text-sm text-muted-foreground">
                — {sampleMemories[memoryIndex].from}, <span className="text-primary/70">{sampleMemories[memoryIndex].role}</span>
              </p>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {sampleMemories.map((_, i) => (
              <button
                key={i}
                onClick={() => setMemoryIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === memoryIndex ? "bg-primary w-4" : "bg-border"
                }`}
              />
            ))}
          </div>

          {/* Tagline */}
          <p className="text-center text-primary/80 italic font-serif text-base mb-8">
            So they never have to wonder.
          </p>

          {/* CTA */}
          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full py-6 text-base rounded-2xl shadow-md"
              onClick={() => setScreen("choose-path")}
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
      </div>
    );
  }

  if (screen === "choose-path") {
    return (
      <div className="min-h-screen flex flex-col bg-background max-w-[430px] mx-auto">
        <header className="flex items-center gap-4 px-6 py-5">
          <button onClick={() => setScreen("home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col justify-center px-8">
          <h2 className="text-xl font-serif text-center mb-8">I want to...</h2>

          <div className="space-y-4">
            {/* Parent card */}
            <button
              onClick={() => { setRole("parent"); setParentType(""); setScreen("signup"); }}
              className="w-full text-center p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-lg font-serif text-foreground mb-1">Start my child's garden</p>
              <p className="text-xs text-muted-foreground">For parents & family</p>
            </button>

            {/* Organization card */}
            <button
              onClick={() => { setRole("organization"); setScreen("signup"); }}
              className="w-full text-center p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <GraduationCap className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-lg font-serif text-foreground mb-1">Add to their story</p>
              <p className="text-xs text-muted-foreground">For schools, coaches, tutors & more</p>
            </button>
          </div>
        </div>

        <div className="px-8 pb-10">
          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <span className="text-primary cursor-pointer hover:underline font-medium" onClick={() => setScreen("login")}>
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
              <div className="text-right pt-1">
                <span
                  className="text-xs text-primary cursor-pointer hover:underline"
                  onClick={() => { setScreen("forgot-password"); setEmail(""); setNewPassword(""); setConfirmPassword(""); setResetSuccess(false); }}
                >
                  Forgot password?
                </span>
              </div>
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
          <button onClick={() => setScreen("choose-path")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <div className="px-8 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sprout className="w-5 h-5 text-primary" />
            <span className="font-serif text-primary text-sm">Memory Garden</span>
          </div>
          <h2 className="text-2xl font-serif mb-6">
            {role === "parent" ? "Create your garden" : "Set up your organization"}
          </h2>

          <div className="space-y-5">
            {/* Parent signup form */}
            {role === "parent" && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">I am...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: "mom", label: "Mom" },
                      { value: "dad", label: "Dad" },
                    ]).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setParentType(option.value)}
                        className={`py-3 rounded-xl border-2 transition-all ${
                          parentType === option.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <span className={`text-sm font-medium ${parentType === option.value ? "text-primary" : "text-foreground"}`}>
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
                <Button onClick={handleRegister} className="w-full py-6 text-base rounded-xl" disabled={isSubmitting || !parentType}>
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                </Button>
              </>
            )}

            {/* Organization signup form */}
            {role === "organization" && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Organization name</Label>
                  <Input type="text" placeholder="e.g. Camp Sunshine, Lincoln Elementary" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Your first name</Label>
                    <Input type="text" placeholder="First" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Your last name</Label>
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
                <Button onClick={handleRegister} className="w-full py-6 text-base rounded-xl" disabled={isSubmitting || !schoolName.trim()}>
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                </Button>
              </>
            )}
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

  if (screen === "forgot-password") {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="flex items-center gap-4 px-6 py-5">
          <button onClick={() => { setScreen("login"); setResetSuccess(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <div className="px-8 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sprout className="w-5 h-5 text-primary" />
            <span className="font-serif text-primary text-sm">Memory Garden</span>
          </div>
          <h2 className="text-2xl font-serif mb-2">Reset password</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your email and choose a new password.</p>

          {resetSuccess ? (
            <div className="space-y-4">
              <p className="text-sm text-primary">Password updated! You can now log in.</p>
              <Button onClick={() => { setScreen("login"); setResetSuccess(false); setPassword(""); }} className="w-full py-6 text-base rounded-xl">
                Go to Login
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Email</Label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">New Password</Label>
                <Input type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="py-5 px-4 text-base rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Confirm Password</Label>
                <Input type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="py-5 px-4 text-base rounded-xl" onKeyDown={(e) => e.key === "Enter" && handleResetPassword()} />
              </div>
              <Button onClick={handleResetPassword} className="w-full py-6 text-base rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
