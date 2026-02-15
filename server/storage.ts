import { 
  type Memory, type InsertMemory, 
  type Child, type InsertChild,
  memories, children
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Memories
  getMemories(childId: string): Promise<Memory[]>;
  getMemoriesByParent(parentId: string): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | undefined>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  updateMemory(id: string, updates: Partial<InsertMemory>): Promise<Memory | undefined>;
  deleteMemory(id: string): Promise<void>;
  
  // Children
  getChild(id: string): Promise<Child | undefined>;
  getChildrenByParent(parentId: string): Promise<Child[]>;
  createChild(child: InsertChild): Promise<Child>;
}

export class DatabaseStorage implements IStorage {
  // Memories
  async getMemories(childId: string): Promise<Memory[]> {
    return db
      .select()
      .from(memories)
      .where(eq(memories.childId, childId))
      .orderBy(desc(memories.createdAt));
  }

  async getMemoriesByParent(parentId: string): Promise<Memory[]> {
    return db
      .select()
      .from(memories)
      .where(eq(memories.parentId, parentId))
      .orderBy(desc(memories.createdAt));
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    const [memory] = await db.select().from(memories).where(eq(memories.id, id));
    return memory || undefined;
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const id = randomUUID();
    const [memory] = await db
      .insert(memories)
      .values({ 
        id,
        type: insertMemory.type,
        rawNote: insertMemory.rawNote,
        refinedNote: insertMemory.refinedNote,
        date: insertMemory.date,
        mediaUrl: insertMemory.mediaUrl,
        mediaType: insertMemory.mediaType,
        shared: insertMemory.shared,
        from: insertMemory.from,
        duration: insertMemory.duration,
        source: insertMemory.source,
        keepsakeType: insertMemory.keepsakeType,
        childId: insertMemory.childId,
        parentId: insertMemory.parentId,
      })
      .returning();
    return memory;
  }

  async updateMemory(id: string, updates: Partial<InsertMemory>): Promise<Memory | undefined> {
    const [memory] = await db
      .update(memories)
      .set(updates)
      .where(eq(memories.id, id))
      .returning();
    return memory || undefined;
  }

  async deleteMemory(id: string): Promise<void> {
    await db.delete(memories).where(eq(memories.id, id));
  }

  // Children
  async getChild(id: string): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child || undefined;
  }

  async getChildrenByParent(parentId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.parentId, parentId));
  }

  async createChild(insertChild: InsertChild): Promise<Child> {
    const id = randomUUID();
    const [child] = await db
      .insert(children)
      .values({ ...insertChild, id })
      .returning();
    return child;
  }

  async updateChild(id: string, updates: Partial<InsertChild>): Promise<Child | undefined> {
    const [child] = await db
      .update(children)
      .set(updates)
      .where(eq(children.id, id))
      .returning();
    return child || undefined;
  }
}

export const storage = new DatabaseStorage();
