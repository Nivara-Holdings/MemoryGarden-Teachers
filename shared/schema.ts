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
  birthday: text("birthday"),
  viewMode: text("view_mode").default("device"),
  age: integer("age"),
  parentId: varchar("parent_id").notNull(),
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

export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  memories: many(memories),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  parent: one(users, {
    fields: [children.parentId],
    references: [users.id],
  }),
  memories: many(memories),
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

export const insertChildSchema = createInsertSchema(children).omit({ id: true });
export const insertMemorySchema = createInsertSchema(memories).omit({ id: true, createdAt: true });

export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
