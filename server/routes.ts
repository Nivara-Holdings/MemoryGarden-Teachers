import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemorySchema, insertChildSchema } from "@shared/schema";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ---- Local File Upload ----
  const uploadsDir = process.env.UPLOADS_DIR || (process.env.NODE_ENV === "production" ? "/app/uploads" : path.join(process.cwd(), "uploads"));
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Helper: check if user is parent, co-parent, or linked teacher for a child
  async function canAccessChild(userId: string, childId: string): Promise<boolean> {
    const child = await storage.getChild(childId);
    if (!child) return false;
    if (child.parentId === userId) return true;
    const teacherLink = await storage.getTeacherLink(userId, childId);
    if (teacherLink) return true;
    // Check co-parent
    const coParentLinks = await storage.getCoParentsByChild(childId);
    if (coParentLinks.some(cp => cp.parentId === userId)) return true;
    return false;
  }

  // Helper: check if user is a teacher for this child
  async function isTeacherForChild(userId: string, childId: string): Promise<boolean> {
    const link = await storage.getTeacherLink(userId, childId);
    return !!link;
  }

  // ---- ADMIN: Cleanup duplicate children (remove after use) ----
  app.get("/api/admin/children", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { children, memories, teacherChildren } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      const all = await db.select().from(children);
      const memCounts = await db.select({ 
        childId: memories.childId, 
        count: sql<number>`count(*)::int` 
      }).from(memories).groupBy(memories.childId);
      const links = await db.select().from(teacherChildren);
      res.json({ children: all, memoryCounts: memCounts, teacherLinks: links });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/children/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { db } = await import("./db");
      const { children, memories, teacherChildren } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(teacherChildren).where(eq(teacherChildren.childId, id));
      await db.delete(memories).where(eq(memories.childId, id));
      await db.delete(children).where(eq(children.id, id));
      res.json({ deleted: id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Fix teacher memories: set from/source for memories created by teachers
  app.patch("/api/admin/fix-teacher-memories", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { memories, teacherChildren } = await import("@shared/schema");
      const { eq, inArray } = await import("drizzle-orm");
      // Get all teacher user IDs
      const links = await db.select().from(teacherChildren);
      const teacherIds = [...new Set(links.map(l => l.teacherId))];
      if (teacherIds.length === 0) return res.json({ updated: 0 });
      // Update memories created by teachers
      const result = await db.update(memories)
        .set({ from: "Teacher", source: "teacher" })
        .where(inArray(memories.parentId, teacherIds));
      res.json({ updated: "done", teacherIds });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  // ---- END ADMIN ----

  // Upload request URL (replaces Replit Object Storage)
  app.post("/api/uploads/request-url", isAuthenticated, (req: any, res) => {
    try {
      const { name, contentType } = req.body;
      const ext = path.extname(name) || ".bin";
      const filename = `${randomUUID()}${ext}`;
      const objectPath = `/uploads/${filename}`;
      const uploadURL = `/api/uploads/file/${filename}`;
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error creating upload URL:", error);
      res.status(500).json({ error: "Failed to create upload URL" });
    }
  });

  // Actual file upload endpoint
  app.put("/api/uploads/file/:filename", isAuthenticated, (req: any, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadsDir, filename);
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Get memories for a child (parent sees all, teacher sees own only)
  app.get("/api/memories/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!await canAccessChild(userId, childId)) {
        return res.status(403).json({ error: "Access denied" });
      }
      let allMemories = await storage.getMemories(childId);
      // Teachers only see their own memories
      if (await isTeacherForChild(userId, childId)) {
        allMemories = allMemories.filter(m => m.parentId === userId);
      }
      res.json(allMemories);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  // Get single memory
  app.get("/api/memory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const memory = await storage.getMemory(id);
      if (!memory) return res.status(404).json({ error: "Memory not found" });
      if (!await canAccessChild(userId, memory.childId)) return res.status(403).json({ error: "Access denied" });
      res.json(memory);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ error: "Failed to fetch memory" });
    }
  });

  // Create memory (parent or linked teacher)
  app.post("/api/memories", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user?.claims?.sub;
      // Verify access to this child
      if (req.body.childId && !await canAccessChild(parentId, req.body.childId)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = insertMemorySchema.parse({ ...req.body, parentId });
      const memory = await storage.createMemory(validatedData);
      res.status(201).json(memory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid memory data", details: error.errors });
      }
      console.error("Error creating memory:", error);
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  // Update memory (only your own)
  app.patch("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const memory = await storage.getMemory(id);
      if (!memory) return res.status(404).json({ error: "Memory not found" });
      if (memory.parentId !== userId) return res.status(403).json({ error: "Access denied" });
      const allowedFields = ['rawNote', 'refinedNote', 'shared', 'from', 'source', 'keepsakeType', 'date'] as const;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const updatedMemory = await storage.updateMemory(id, updates);
      res.json(updatedMemory);
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  // Delete memory (only your own)
  app.delete("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const memory = await storage.getMemory(id);
      if (!memory) return res.status(404).json({ error: "Memory not found" });
      if (memory.parentId !== userId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteMemory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // Get child profile (parent or linked teacher)
  app.get("/api/children/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const child = await storage.getChild(id);
      if (!child) return res.status(404).json({ error: "Child not found" });
      if (!await canAccessChild(userId, id)) return res.status(403).json({ error: "Access denied" });
      res.json(child);
    } catch (error) {
      console.error("Error fetching child:", error);
      res.status(500).json({ error: "Failed to fetch child" });
    }
  });

  // Get all children for current user (parent's own + co-parent + teacher-linked)
  app.get("/api/children", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parentChildren = await storage.getChildrenByParent(userId);
      const teacherChildren = await storage.getChildrenByTeacher(userId);
      const coParentChildren = await storage.getChildrenByCoParent(userId);
      // Merge and deduplicate by id
      const allChildren = [...parentChildren];
      for (const tc of [...teacherChildren, ...coParentChildren]) {
        if (!allChildren.some(c => c.id === tc.id)) {
          allChildren.push(tc);
        }
      }
      res.json(allChildren);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  // Create child
  app.post("/api/children", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user?.claims?.sub;
      const validatedData = insertChildSchema.parse({ ...req.body, parentId });
      const child = await storage.createChild(validatedData);
      res.status(201).json(child);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid child data", details: error.errors });
      }
      console.error("Error creating child:", error);
      res.status(500).json({ error: "Failed to create child" });
    }
  });

  // Update child (profile photo, name, etc.) — parent or linked teacher
  app.patch("/api/children/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const child = await storage.getChild(id);
      if (!child) return res.status(404).json({ error: "Child not found" });
      if (!await canAccessChild(userId, id)) return res.status(403).json({ error: "Access denied" });
      const updates: Record<string, any> = {};
      const allowedFields = ['name', 'nickname', 'birthday', 'age', 'profilePhoto'] as const;
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const updatedChild = await storage.updateChild(id, updates);
      res.json(updatedChild);
    } catch (error) {
      console.error("Error updating child:", error);
      res.status(500).json({ error: "Failed to update child" });
    }
  });

  // Delete child profile (only the primary parent can delete)
  app.delete("/api/children/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const child = await storage.getChild(id);
      if (!child) return res.status(404).json({ error: "Child not found" });
      if (child.parentId !== userId) {
        return res.status(403).json({ error: "Only the primary parent can delete a child profile" });
      }

      // Cascade delete: memories, teacher links, co-parent links, then child
      await storage.deleteMemoriesByChild(id);
      await storage.deleteTeacherLinksByChild(id);
      await storage.deleteCoParentsByChild(id);
      await storage.deleteChild(id);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ error: "Failed to delete child" });
    }
  });

  // ---- Co-Parent Invites ----

  // Invite a co-parent to a child's garden
  app.post("/api/children/:childId/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { childId } = req.params;
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      // Verify user has access to this child
      if (!await canAccessChild(userId, childId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if already invited
      const existing = await storage.getCoParentByEmail(normalizedEmail, childId);
      if (existing) {
        return res.status(400).json({ error: "This person has already been invited" });
      }

      // Check if this is the child's primary parent email
      const child = await storage.getChild(childId);
      const primaryParent = child ? await authStorage.getUser(child.parentId) : null;
      if (primaryParent?.email === normalizedEmail) {
        return res.status(400).json({ error: "This person is already the primary parent" });
      }

      // Check if invitee already has an account
      const invitee = await authStorage.getUserByEmail(normalizedEmail);
      const invite = await storage.inviteCoParent(
        normalizedEmail, childId, userId, invitee?.id || undefined
      );

      res.status(201).json({
        ...invite,
        linked: !!invitee,
      });
    } catch (error) {
      console.error("Error inviting co-parent:", error);
      res.status(500).json({ error: "Failed to invite co-parent" });
    }
  });

  // Get co-parents for a child
  app.get("/api/children/:childId/co-parents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { childId } = req.params;
      if (!await canAccessChild(userId, childId)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const coParentsList = await storage.getCoParentsByChild(childId);
      res.json(coParentsList);
    } catch (error) {
      console.error("Error fetching co-parents:", error);
      res.status(500).json({ error: "Failed to fetch co-parents" });
    }
  });

  // Public garden view
  app.get("/api/garden/:childId", async (req, res) => {
    try {
      const { childId } = req.params;
      const child = await storage.getChild(childId);
      if (!child) return res.status(404).json({ error: "Garden not found" });
      const memories = await storage.getMemories(childId);
      const sharedMemories = memories.filter(m => m.shared);
      res.json({ child, memories: sharedMemories });
    } catch (error) {
      console.error("Error fetching garden:", error);
      res.status(500).json({ error: "Failed to fetch garden" });
    }
  });

  // Note refinement using Anthropic Claude
  app.post("/api/refine-note", isAuthenticated, async (req: any, res) => {
    try {
      const { rawNote, childName, childNickname, style = "polish" } = req.body;
      if (!rawNote) return res.status(400).json({ error: "Raw note is required" });

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your .env file." });
      }

      const childRef = childName ? ` named ${childName}` : '';
      const nicknameRef = childNickname ? ` (nickname: "${childNickname}")` : '';
      
      const systemPrompt = `You are a gentle writing assistant for Memory Garden — an app where parents plant memories for their children. These memories form a living garden that grows with the child. A child might read this today, at age 10, at 15, or at 30. These words help them understand who they are, how special they are, how far they've come, and how deeply they are loved. Humans are made of memories — and you are helping preserve the most important ones.

You are writing for a parent about their child${childRef}${nicknameRef}.${childNickname ? ` The parent sometimes calls their child "${childNickname}" — you may use this nickname naturally if it fits, but don't force it.` : ''}

GUARDRAILS:
- A CHILD will read these words about themselves. Every word matters.
- NEVER add negative, critical, or embarrassing content about the child.
- NEVER invent details, events, or emotions that weren't in the original note.
- NEVER add content that could be hurtful or uncomfortable for a child to read about themselves.
- NEVER make it overly dramatic or artificially sentimental — children can tell when something is fake.
- ALWAYS preserve the parent's authentic voice and intention.
- ALWAYS write in first person (the parent speaking).
- Keep the warmth genuine. A real parent writing to their real child.
- Keep output length proportional to input length. Short input = short output.
- If the input is 1-5 words, return it with minimal changes.
- Return ONLY the refined text. No preamble, no quotes, no explanation.`;

      const prompts: Record<string, string> = {
        fix: `Fix only grammar, spelling, and punctuation in this parent's note about their child${childRef}. Do NOT change meaning, tone, or add words. If 1-3 words, return unchanged.`,
        polish: `Gently clean up this parent's note about their child${childRef}. Fix grammar, smooth wording, add a touch of warmth — but keep their natural voice. Do NOT expand short notes into long paragraphs. Do NOT add details that weren't there. The child will read this someday, so make it feel loving but honest.`,
      };

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: "user", content: `[Style: ${style}] ${rawNote}` }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Anthropic API error");
      }

      const data = await response.json();
      const refinedNote = data.content?.[0]?.text || rawNote;
      res.json({ refinedNote });
    } catch (error) {
      console.error("Error refining note:", error);
      res.status(500).json({ error: "Failed to refine note. Check your Anthropic API key." });
    }
  });

  // Rate limit tracking for photo reads (25 per week per user)
  const photoReadCounts = new Map<string, { count: number; weekStart: number }>();

  function getPhotoReadCount(userId: string): number {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const entry = photoReadCounts.get(userId);
    if (!entry || (now - entry.weekStart) > weekMs) {
      return 0;
    }
    return entry.count;
  }

  function incrementPhotoReadCount(userId: string, imageCount: number): void {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const entry = photoReadCounts.get(userId);
    if (!entry || (now - entry.weekStart) > weekMs) {
      photoReadCounts.set(userId, { count: imageCount, weekStart: now });
    } else {
      entry.count += imageCount;
    }
  }

  // Read photos and generate a memory note using Claude Vision
  app.post("/api/read-photos", isAuthenticated, async (req: any, res) => {
    try {
      const { imageUrls, childName, childNickname } = req.body;
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "Image URLs are required" });
      }

      // Only read up to 10 images to keep API costs manageable
      const imagesToRead = imageUrls.slice(0, 10);

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ error: "Anthropic API key not configured." });
      }

      const userId = req.user?.claims?.sub;
      const currentCount = getPhotoReadCount(userId);
      if (currentCount + imagesToRead.length > 25) {
        const remaining = Math.max(0, 25 - currentCount);
        return res.status(429).json({ 
          error: `Weekly photo read limit reached. You have ${remaining} photo reads left this week.`,
          remaining 
        });
      }

      // Read images from disk, resize if needed, and convert to base64
      const imageContent: any[] = [];

      for (const url of imagesToRead) {
        const filename = url.replace("/uploads/", "");
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          let fileBuffer = fs.readFileSync(filePath);
          
          // Resize if over 3MB to stay safely under Claude's 5MB limit
          if (fileBuffer.length > 3 * 1024 * 1024) {
            fileBuffer = await sharp(fileBuffer)
              .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 70 })
              .toBuffer();
          }
          
          const base64 = fileBuffer.toString("base64");
          const ext = path.extname(filename).toLowerCase();
          // If we resized to jpeg, use jpeg type
          const mediaType = fileBuffer.length < 3 * 1024 * 1024 && ext === ".png" ? "image/png" : 
                           ext === ".webp" ? "image/webp" : "image/jpeg";
          imageContent.push({
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 }
          });
        }
      }

      if (imageContent.length === 0) {
        return res.status(400).json({ error: "No valid images found" });
      }

      const childRef = childName ? ` named ${childName}` : '';
      const nicknameNote = childNickname ? ` The parent calls them "${childNickname}" — you can use this nickname naturally if it fits.` : '';

      const systemPrompt = `You help parents write short memory notes for their kids in an app called Memory Garden.

A parent uploaded photos of something their child${childRef} received or made.${nicknameNote}

Read the photos and write a quick note AS THE PARENT talking TO THE CHILD (using "you/your"). This is a note the child will read someday.

Rules:
- 2-3 sentences max.
- Write TO the child: "you" not "he/she/they"
- Include how the parent feels — proud, teary, heart full, smiling. Make it real, not cheesy.
- Don't list every detail. Pick the highlights.
- Don't be dramatic or poetic. Just a real parent being real.
- If classmates/friends wrote notes, mention a few standout quotes and names, not all.
- Return ONLY the note text. Nothing else.`;

      imageContent.push({
        type: "text",
        text: "Please read these photos and write a memory note from a parent's perspective."
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: imageContent }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Anthropic API error");
      }

      incrementPhotoReadCount(userId, imagesToRead.length);

      const data = await response.json();
      const generatedNote = data.content?.[0]?.text || "";
      const remaining = 25 - getPhotoReadCount(userId);
      res.json({ generatedNote, remaining });
    } catch (error: any) {
      console.error("Error reading photos:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to read photos." });
    }
  });

  // Generate monthly story summary using Anthropic Claude
  app.post("/api/generate-story", isAuthenticated, async (req: any, res) => {
    try {
      const { notes, childName, monthLabel } = req.body;
      if (!notes) return res.status(400).json({ error: "Notes are required" });

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ error: "Anthropic API key not configured." });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          system: `Write a 1-2 sentence summary of a child's month based on their parent's memory notes. The child's name is ${childName || "their child"} and this is for ${monthLabel}. Be warm but natural — like a journal entry, not a greeting card. No quotes. Just the summary.`,
          messages: [{ role: "user", content: notes }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "API error");
      }

      const data = await response.json();
      const summary = data.content?.[0]?.text || "";
      res.json({ summary });
    } catch (error) {
      console.error("Error generating story:", error);
      res.status(500).json({ error: "Failed to generate story" });
    }
  });

  // ========================================
  // TEACHER ROUTES
  // ========================================

  // Get children linked to this teacher
  app.get("/api/teacher/children", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const children = await storage.getChildrenByTeacher(teacherId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching teacher children:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  // Teacher adds a child (with parent email for linking)
  app.post("/api/teacher/children", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { name, parentEmail, birthday, age } = req.body;
      if (!name || !parentEmail) {
        return res.status(400).json({ error: "Child name and parent email are required" });
      }

      // Check if parent already has an account
      const existingParent = await authStorage.getUserByEmail(parentEmail);
      
      let child;
      let parentLinked = false;

      if (existingParent) {
        // Look for an existing child with matching name under this parent
        const parentChildren = await storage.getChildrenByParent(existingParent.id);
        const existingChild = parentChildren.find(
          (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
        );

        if (existingChild) {
          // Link teacher to the existing child
          child = existingChild;
        } else {
          // Parent exists but no matching child — create under parent
          child = await storage.createChild({
            name, parentId: existingParent.id, parentEmail,
            nickname: null, birthday: birthday || null,
            viewMode: "device", age: age || null, profilePhoto: null,
          });
        }
        parentLinked = true;
      } else {
        // No parent account yet — create child under teacher temporarily
        child = await storage.createChild({
          name, parentId: teacherId, parentEmail,
          nickname: null, birthday: birthday || null,
          viewMode: "device", age: age || null, profilePhoto: null,
        });
      }

      // Link teacher to child (skip if already linked)
      const existingLink = await storage.getTeacherLink(teacherId, child.id);
      if (!existingLink) {
        await storage.linkTeacherToChild(teacherId, child.id);
      }

      res.status(201).json({
        ...child,
        parentLinked,
      });
    } catch (error) {
      console.error("Error adding teacher child:", error);
      res.status(500).json({ error: "Failed to add child" });
    }
  });

  // Teacher bulk-adds children via CSV
  app.post("/api/teacher/children/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { csvContent } = req.body;
      if (!csvContent || typeof csvContent !== "string") {
        return res.status(400).json({ error: "CSV content is required" });
      }

      const lines = csvContent.split(/\r?\n/).filter((line: string) => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have a header row and at least one data row" });
      }

      // Parse header row
      const headerRaw = lines[0].toLowerCase().split(",").map((h: string) => h.trim());
      const firstNameIdx = headerRaw.findIndex((h: string) => h === "first name" || h === "first_name" || h === "firstname");
      const lastNameIdx = headerRaw.findIndex((h: string) => h === "last name" || h === "last_name" || h === "lastname");
      // Also support a single "name" column as fallback
      const nameIdx = headerRaw.findIndex((h: string) => h === "name" || h === "child name" || h === "student name" || h === "student");
      const emailIdx = headerRaw.findIndex((h: string) => h === "parent email" || h === "email" || h === "parent_email");
      const birthdayIdx = headerRaw.findIndex((h: string) => h === "birthday" || h === "dob" || h === "date of birth");
      const ageIdx = headerRaw.findIndex((h: string) => h === "age");

      const hasNameColumn = firstNameIdx !== -1 || nameIdx !== -1;
      if (!hasNameColumn || emailIdx === -1) {
        return res.status(400).json({
          error: "CSV must have 'first name' (or 'name') and 'parent email' columns in the header row",
        });
      }

      const results = { created: 0, linked: 0, skipped: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c: string) => c.trim());
        // Build the child's name: prefer first name column, fall back to single name column
        let name: string;
        if (firstNameIdx !== -1) {
          const firstName = cols[firstNameIdx]?.trim() || "";
          const lastName = lastNameIdx !== -1 ? (cols[lastNameIdx]?.trim() || "") : "";
          name = firstName; // Profile uses first name only
        } else {
          name = cols[nameIdx]?.trim() || "";
        }
        const parentEmailVal = cols[emailIdx]?.trim().toLowerCase();

        if (!name || !parentEmailVal) {
          results.errors.push(`Row ${i + 1}: missing name or parent email`);
          results.skipped++;
          continue;
        }

        if (!parentEmailVal.includes("@")) {
          results.errors.push(`Row ${i + 1}: invalid email "${parentEmailVal}"`);
          results.skipped++;
          continue;
        }

        const birthday = birthdayIdx !== -1 ? (cols[birthdayIdx]?.trim() || null) : null;
        const ageStr = ageIdx !== -1 ? cols[ageIdx]?.trim() : null;
        const age = ageStr ? parseInt(ageStr) : null;

        try {
          const existingParent = await authStorage.getUserByEmail(parentEmailVal);
          let child;
          let parentLinked = false;

          if (existingParent) {
            const parentChildren = await storage.getChildrenByParent(existingParent.id);
            const existingChild = parentChildren.find(
              (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
            );
            if (existingChild) {
              child = existingChild;
            } else {
              child = await storage.createChild({
                name, parentId: existingParent.id, parentEmail: parentEmailVal,
                nickname: null, birthday: birthday || null,
                viewMode: "device", age: (age !== null && !isNaN(age)) ? age : null, profilePhoto: null,
              });
            }
            parentLinked = true;
            results.linked++;
          } else {
            child = await storage.createChild({
              name, parentId: teacherId, parentEmail: parentEmailVal,
              nickname: null, birthday: birthday || null,
              viewMode: "device", age: (age !== null && !isNaN(age)) ? age : null, profilePhoto: null,
            });
          }

          const existingLink = await storage.getTeacherLink(teacherId, child.id);
          if (!existingLink) {
            await storage.linkTeacherToChild(teacherId, child.id);
          }
          results.created++;
        } catch (rowError: any) {
          results.errors.push(`Row ${i + 1} (${name}): ${rowError.message}`);
          results.skipped++;
        }
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Error bulk adding children:", error);
      res.status(500).json({ error: "Failed to process CSV" });
    }
  });

  // Teacher removes a child from their list
  app.delete("/api/teacher/children/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { childId } = req.params;

      // Verify link exists
      const link = await storage.getTeacherLink(teacherId, childId);
      if (!link) return res.status(404).json({ error: "Child not linked to you" });

      await storage.unlinkTeacherFromChild(teacherId, childId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing teacher child:", error);
      res.status(500).json({ error: "Failed to remove child" });
    }
  });

  // Teacher gets memories they added for a child
  app.get("/api/teacher/memories/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { childId } = req.params;

      // Verify teacher is linked to this child
      const link = await storage.getTeacherLink(teacherId, childId);
      if (!link) return res.status(403).json({ error: "Access denied" });

      const allMemories = await storage.getMemories(childId);
      // Teacher only sees their own memories
      const teacherMemories = allMemories.filter(m => m.parentId === teacherId);
      res.json(teacherMemories);
    } catch (error) {
      console.error("Error fetching teacher memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  // Teacher adds a memory for a child
  app.post("/api/teacher/memories", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { childId, rawNote, date, type, source } = req.body;
      if (!childId || !rawNote) {
        return res.status(400).json({ error: "childId and rawNote are required" });
      }

      // Verify teacher is linked to this child
      const link = await storage.getTeacherLink(teacherId, childId);
      if (!link) return res.status(403).json({ error: "Access denied" });

      const memory = await storage.createMemory({
        type: type || "moment",
        rawNote,
        refinedNote: null,
        date: date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        mediaUrl: null,
        mediaType: null,
        shared: true,
        from: "Teacher",
        duration: null,
        source: source || "teacher",
        keepsakeType: null,
        childId,
        parentId: teacherId,
      });
      res.status(201).json(memory);
    } catch (error) {
      console.error("Error creating teacher memory:", error);
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  // Teacher updates their own memory
  app.patch("/api/teacher/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { id } = req.params;
      const memory = await storage.getMemory(id);
      if (!memory) return res.status(404).json({ error: "Memory not found" });
      if (memory.parentId !== teacherId) return res.status(403).json({ error: "Access denied" });

      const allowedFields = ['rawNote', 'refinedNote', 'date', 'source'] as const;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      const updated = await storage.updateMemory(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating teacher memory:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  // Teacher deletes their own memory
  app.delete("/api/teacher/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const teacherId = req.user?.claims?.sub;
      const { id } = req.params;
      const memory = await storage.getMemory(id);
      if (!memory) return res.status(404).json({ error: "Memory not found" });
      if (memory.parentId !== teacherId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteMemory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting teacher memory:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  return httpServer;
}
