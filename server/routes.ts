import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemorySchema, insertChildSchema } from "@shared/schema";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get memories for a child (authenticated parent only)
  app.get("/api/memories/:childId", isAuthenticated, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const parentId = req.user?.claims?.sub;
      
      // Verify parent owns this child
      const child = await storage.getChild(childId);
      if (!child || child.parentId !== parentId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const memories = await storage.getMemories(childId);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  // Get single memory
  app.get("/api/memory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user?.claims?.sub;
      
      const memory = await storage.getMemory(id);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      if (memory.parentId !== parentId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(memory);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ error: "Failed to fetch memory" });
    }
  });

  // Create memory (authenticated)
  app.post("/api/memories", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user?.claims?.sub;
      const validatedData = insertMemorySchema.parse({
        ...req.body,
        parentId,
      });
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

  // Update memory (authenticated)
  app.patch("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user?.claims?.sub;
      
      const memory = await storage.getMemory(id);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      if (memory.parentId !== parentId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Only allow specific fields to be updated (security: prevent changing parentId/childId)
      const allowedFields = ['rawNote', 'refinedNote', 'shared', 'from', 'source', 'keepsakeType', 'date'] as const;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      const updatedMemory = await storage.updateMemory(id, updates);
      res.json(updatedMemory);
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  // Delete memory (authenticated)
  app.delete("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user?.claims?.sub;
      
      const memory = await storage.getMemory(id);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      if (memory.parentId !== parentId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteMemory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // Get child profile
  app.get("/api/children/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user?.claims?.sub;
      
      const child = await storage.getChild(id);
      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }
      if (child.parentId !== parentId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(child);
    } catch (error) {
      console.error("Error fetching child:", error);
      res.status(500).json({ error: "Failed to fetch child" });
    }
  });

  // Get all children for current parent
  app.get("/api/children", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user?.claims?.sub;
      const children = await storage.getChildrenByParent(parentId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  // Create child (authenticated)
  app.post("/api/children", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = req.user?.claims?.sub;
      const validatedData = insertChildSchema.parse({
        ...req.body,
        parentId,
      });
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

  // Public endpoint: Get memories for child view (no auth required)
  app.get("/api/garden/:childId", async (req, res) => {
    try {
      const { childId } = req.params;
      const child = await storage.getChild(childId);
      if (!child) {
        return res.status(404).json({ error: "Garden not found" });
      }
      
      const memories = await storage.getMemories(childId);
      // Only return shared memories
      const sharedMemories = memories.filter(m => m.shared);
      res.json({ child, memories: sharedMemories });
    } catch (error) {
      console.error("Error fetching garden:", error);
      res.status(500).json({ error: "Failed to fetch garden" });
    }
  });

  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Note refinement endpoint using OpenAI
  app.post("/api/refine-note", isAuthenticated, async (req: any, res) => {
    try {
      const { rawNote, childName } = req.body;
      
      if (!rawNote) {
        return res.status(400).json({ error: "Raw note is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are helping a parent write a heartfelt message for their child${childName ? ` named ${childName}` : ''}. 
Polish their raw notes into a warm, meaningful message that preserves their original sentiment and voice. 
Keep the message personal and intimate - this is for a memory garden that the child will read someday.
Don't add new content, just refine and elevate what they wrote. Keep it concise (2-4 sentences).
Write in first person as the parent speaking to the child.`
          },
          {
            role: "user",
            content: rawNote
          }
        ],
        max_tokens: 300,
      });

      const refinedNote = response.choices[0]?.message?.content || rawNote;
      res.json({ refinedNote });
    } catch (error) {
      console.error("Error refining note:", error);
      res.status(500).json({ error: "Failed to refine note" });
    }
  });

  return httpServer;
}
