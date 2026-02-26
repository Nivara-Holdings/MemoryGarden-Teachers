import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth schema (users + sessions tables)
export * from "./models/auth";
import { users } from "./models/auth";

export const memoryTypes = ["moment", "voiceMemo", "fromOthers", "keepsake"] as const;
export type MemoryType = typeof memoryTypes[number];

export const children = pgTable("children", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  birthday: text("birthday"),
  viewMode: text("view_mode").default("device"),
  age: integer("age"),
  profilePhoto: text("profile_photo"),
  parentId: varchar("parent_id").notNull(),
  parentEmail: varchar("parent_email"),  // set by teacher when adding a child
});

export const memories = pgTable("memories", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull().$type<MemoryType>(),
  rawNote: text("raw_note").notNull(),
  refinedNote: text("refined_note"),
  date: text("date").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  shared: boolean("shared").default(true),
  from: text("from").notNull(),
  duration: text("duration"),
  source: text("source"),
  keepsakeType: text("keepsake_type"),
  childId: varchar("child_id").notNull(),
  parentId: varchar("parent_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Links teachers to children they manage
export const teacherChildren = pgTable("teacher_children", {
  id: varchar("id").primaryKey(),
  teacherId: varchar("teacher_id").notNull(),
  childId: varchar("child_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Links co-parents to children (e.g. Dad invited by Mom)
export const coParents = pgTable("co_parents", {
  id: varchar("id").primaryKey(),
  parentId: varchar("parent_id"),          // null until they sign up
  email: varchar("email").notNull(),        // invited email
  childId: varchar("child_id").notNull(),
  invitedBy: varchar("invited_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---- Relations ----

export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  memories: many(memories),
  teacherLinks: many(teacherChildren),
  coParentLinks: many(coParents),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  parent: one(users, {
    fields: [children.parentId],
    references: [users.id],
  }),
  memories: many(memories),
  teacherLinks: many(teacherChildren),
  coParentLinks: many(coParents),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  child: one(children, {
    fields: [memories.childId],
    references: [children.id],
  }),
  parent: one(users, {
    fields: [memories.parentId],
    references: [users.id],
  }),
}));

export const teacherChildrenRelations = relations(teacherChildren, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherChildren.teacherId],
    references: [users.id],
  }),
  child: one(children, {
    fields: [teacherChildren.childId],
    references: [children.id],
  }),
}));

export const coParentsRelations = relations(coParents, ({ one }) => ({
  parent: one(users, {
    fields: [coParents.parentId],
    references: [users.id],
  }),
  child: one(children, {
    fields: [coParents.childId],
    references: [children.id],
  }),
  inviter: one(users, {
    fields: [coParents.invitedBy],
    references: [users.id],
  }),
}));

// ---- Insert Schemas ----

export const insertChildSchema = createInsertSchema(children).omit({ id: true });
export const insertMemorySchema = createInsertSchema(memories).omit({ id: true, createdAt: true });

export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
export type TeacherChild = typeof teacherChildren.$inferSelect;
export type CoParent = typeof coParents.$inferSelect;
