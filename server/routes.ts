import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemorySchema, insertChildSchema } from "@shared/schema";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";

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

  return httpServer;
}
