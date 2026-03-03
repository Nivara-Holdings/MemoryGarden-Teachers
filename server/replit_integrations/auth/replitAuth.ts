import session from "express-session";
import type { Express, RequestHandler } from "express";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { randomUUID, createHash } from "crypto";
import connectPg from "connect-pg-simple";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// When a parent signs up, auto-link any children a teacher already added with their email
// AND link any co-parent invites
async function autoLinkChildrenByEmail(userId: string, email: string) {
  try {
    // Link teacher-added children
    const unlinkedChildren = await storage.getChildrenByParentEmail(email);
    for (const child of unlinkedChildren) {
      if (child.parentId !== userId) {
        await storage.updateChild(child.id, { parentId: userId });
      }
    }
    // Link co-parent invites
    await storage.linkCoParent(email, userId);
  } catch (error) {
    console.error("Auto-link children error:", error);
  }
}

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  // Set req.user from session
  app.use((req: any, _res: any, next: any) => {
    if (req.session && req.session.userId) {
      req.user = { claims: { sub: req.session.userId } };
    }
    next();
  });

  // Email/Password Registration
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (role && !["mom", "dad", "teacher"].includes(role)) {
        return res.status(400).json({ message: "Role must be mom, dad, or teacher" });
      }
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const user = await authStorage.upsertUser({
        id: randomUUID(),
        email,
        passwordHash: hashPassword(password),
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        role: role || null,
      });
      req.session.userId = user.id;

      // Auto-link children if a teacher added them with this email
      if (role === "mom" || role === "dad") {
        await autoLinkChildrenByEmail(user.id, email);
      }

      res.status(201).json(user);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email/Password Login
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await authStorage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Google OAuth
  app.post("/api/auth/google", async (req: any, res) => {
    try {
      const { credential, role } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
      }
      const payload = JSON.parse(
        Buffer.from(credential.split(".")[1], "base64").toString()
      );
      const { sub: googleId, email, given_name, family_name, picture } = payload;
      let user = await authStorage.getUserByGoogleId(googleId);
      if (!user) {
        user = await authStorage.getUserByEmail(email);
        if (user) {
          user = await authStorage.upsertUser({ ...user, googleId, profileImageUrl: picture || user.profileImageUrl });
        } else {
          user = await authStorage.upsertUser({
            id: randomUUID(), email, firstName: given_name || null,
            lastName: family_name || null, profileImageUrl: picture || null, googleId,
            role: role || null,
          });

          // Auto-link children for new parent accounts
          if (role === "mom" || role === "dad") {
            await autoLinkChildrenByEmail(user.id, email);
          }
        }
      }
      req.session.userId = user.id;
      res.json(user);
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ message: "Google authentication failed" });
    }
  });

  // Update user role
  app.patch("/api/auth/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      if (!role || !["mom", "dad", "teacher"].includes(role)) {
        return res.status(400).json({ message: "Role must be mom, dad, or teacher" });
      }
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updated = await authStorage.upsertUser({ ...user, role });

      // Auto-link if switching to a parent role
      if ((role === "mom" || role === "dad") && user.email) {
        await autoLinkChildrenByEmail(userId, user.email);
      }

      res.json(updated);
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Simple password reset (no email verification — pilot only)
  app.post("/api/auth/reset-password", async (req: any, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const user = await authStorage.getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return res.status(404).json({ message: "No account found with this email" });
      }
      if (!user.passwordHash && user.googleId) {
        return res.status(400).json({ message: "This account uses Google sign-in. Please log in with Google." });
      }
      await authStorage.upsertUser({
        ...user,
        passwordHash: hashPassword(newPassword),
      });
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Delete user account
  app.delete("/api/auth/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role === "teacher") {
        // Unlink from all students (don't delete the children)
        await storage.deleteAllTeacherLinks(userId);
        // Delete teacher-created memories
        await storage.deleteMemoriesByParent(userId);
      } else {
        // Parent: delete their children and all associated data
        const userChildren = await storage.getChildrenByParent(userId);
        for (const child of userChildren) {
          await storage.deleteMemoriesByChild(child.id);
          await storage.deleteTeacherLinksByChild(child.id);
          await storage.deleteCoParentsByChild(child.id);
          await storage.deleteChild(child.id);
        }
        // Delete memories they created as a co-parent
        await storage.deleteMemoriesByParent(userId);
        // Remove co-parent links
        await storage.deleteCoParentsByParent(userId);
      }

      // Delete user record
      await authStorage.deleteUser(userId);

      // Destroy session
      req.session.destroy(() => {
        res.json({ message: "Account deleted" });
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/login", (_req, res) => res.redirect("/"));
  app.get("/api/callback", (_req, res) => res.redirect("/"));
  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => res.redirect("/"));
  });
  app.post("/api/logout", (req: any, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.user && req.user.claims && req.user.claims.sub) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
