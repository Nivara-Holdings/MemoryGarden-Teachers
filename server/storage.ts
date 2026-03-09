import { 
  type Memory, type InsertMemory, 
  type Child, type InsertChild,
  type TeacherChild,
  type CoParent,
  memories, children, teacherChildren, coParents
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
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
  getChildrenByParentEmail(email: string): Promise<Child[]>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: string, updates: Partial<InsertChild>): Promise<Child | undefined>;

  // Teacher-Child links
  getChildrenByTeacher(teacherId: string): Promise<Child[]>;
  linkTeacherToChild(teacherId: string, childId: string): Promise<TeacherChild>;
  unlinkTeacherFromChild(teacherId: string, childId: string): Promise<void>;
  getTeacherLink(teacherId: string, childId: string): Promise<TeacherChild | undefined>;

  // Cascade delete operations
  deleteChild(id: string): Promise<void>;
  deleteMemoriesByChild(childId: string): Promise<void>;
  deleteMemoriesByParent(parentId: string): Promise<void>;
  deleteTeacherLinksByChild(childId: string): Promise<void>;
  deleteAllTeacherLinks(teacherId: string): Promise<void>;
  deleteCoParentsByChild(childId: string): Promise<void>;
  deleteCoParentsByParent(parentId: string): Promise<void>;

  // Co-Parent links
  getChildrenByCoParent(parentId: string): Promise<Child[]>;
  getCoParentsByChild(childId: string): Promise<CoParent[]>;
  getCoParentByEmail(email: string, childId: string): Promise<CoParent | undefined>;
  getPendingCoParentInvites(email: string): Promise<CoParent[]>;
  inviteCoParent(email: string, childId: string, invitedBy: string, parentId?: string): Promise<CoParent>;
  linkCoParent(email: string, parentId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ---- Memories ----
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
        audioUrl: insertMemory.audioUrl,
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

  // ---- Children ----
  async getChild(id: string): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child || undefined;
  }

  async getChildrenByParent(parentId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.parentId, parentId));
  }

  async getChildrenByParentEmail(email: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.parentEmail, email));
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

  // ---- Teacher-Child Links ----
  async getChildrenByTeacher(teacherId: string): Promise<Child[]> {
    const links = await db
      .select()
      .from(teacherChildren)
      .where(eq(teacherChildren.teacherId, teacherId));
    
    const results: Child[] = [];
    for (const link of links) {
      const child = await this.getChild(link.childId);
      if (child) results.push(child);
    }
    return results;
  }

  async linkTeacherToChild(teacherId: string, childId: string): Promise<TeacherChild> {
    const id = randomUUID();
    const [link] = await db
      .insert(teacherChildren)
      .values({ id, teacherId, childId })
      .returning();
    return link;
  }

  async unlinkTeacherFromChild(teacherId: string, childId: string): Promise<void> {
    await db
      .delete(teacherChildren)
      .where(and(eq(teacherChildren.teacherId, teacherId), eq(teacherChildren.childId, childId)));
  }

  async getTeacherLink(teacherId: string, childId: string): Promise<TeacherChild | undefined> {
    const [link] = await db
      .select()
      .from(teacherChildren)
      .where(and(eq(teacherChildren.teacherId, teacherId), eq(teacherChildren.childId, childId)));
    return link || undefined;
  }

  // ---- Co-Parent Links ----
  async getChildrenByCoParent(parentId: string): Promise<Child[]> {
    const links = await db
      .select()
      .from(coParents)
      .where(eq(coParents.parentId, parentId));
    const results: Child[] = [];
    for (const link of links) {
      const child = await this.getChild(link.childId);
      if (child) results.push(child);
    }
    return results;
  }

  async getCoParentsByChild(childId: string): Promise<CoParent[]> {
    return db.select().from(coParents).where(eq(coParents.childId, childId));
  }

  async getCoParentByEmail(email: string, childId: string): Promise<CoParent | undefined> {
    const [link] = await db
      .select()
      .from(coParents)
      .where(and(eq(coParents.email, email), eq(coParents.childId, childId)));
    return link || undefined;
  }

  async getPendingCoParentInvites(email: string): Promise<CoParent[]> {
    return db
      .select()
      .from(coParents)
      .where(and(eq(coParents.email, email), isNull(coParents.parentId)));
  }

  async inviteCoParent(email: string, childId: string, invitedBy: string, parentId?: string): Promise<CoParent> {
    const id = randomUUID();
    const [link] = await db
      .insert(coParents)
      .values({ id, email, childId, invitedBy, parentId: parentId || null })
      .returning();
    return link;
  }

  async linkCoParent(email: string, parentId: string): Promise<void> {
    await db
      .update(coParents)
      .set({ parentId })
      .where(and(eq(coParents.email, email), isNull(coParents.parentId)));
  }

  // ---- Cascade Delete Operations ----
  async deleteChild(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
  }

  async deleteMemoriesByChild(childId: string): Promise<void> {
    await db.delete(memories).where(eq(memories.childId, childId));
  }

  async deleteMemoriesByParent(parentId: string): Promise<void> {
    await db.delete(memories).where(eq(memories.parentId, parentId));
  }

  async deleteTeacherLinksByChild(childId: string): Promise<void> {
    await db.delete(teacherChildren).where(eq(teacherChildren.childId, childId));
  }

  async deleteAllTeacherLinks(teacherId: string): Promise<void> {
    await db.delete(teacherChildren).where(eq(teacherChildren.teacherId, teacherId));
  }

  async deleteCoParentsByChild(childId: string): Promise<void> {
    await db.delete(coParents).where(eq(coParents.childId, childId));
  }

  async deleteCoParentsByParent(parentId: string): Promise<void> {
    await db.delete(coParents).where(eq(coParents.parentId, parentId));
  }
}

export const storage = new DatabaseStorage();
