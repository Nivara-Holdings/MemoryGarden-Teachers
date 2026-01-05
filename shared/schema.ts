import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const memoryTypes = ["moment", "voiceMemo", "fromOthers", "keepsake"] as const;
export type MemoryType = typeof memoryTypes[number];

export const memories = pgTable("memories", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull().$type<MemoryType>(),
  note: text("note").notNull(),
  date: text("date").notNull(),
  hasPhoto: boolean("has_photo").default(false),
  shared: boolean("shared").default(true),
  from: text("from").notNull(),
  duration: text("duration"),
  transcript: boolean("transcript").default(false),
  source: text("source"),
  keepsakeType: text("keepsake_type"),
  childId: varchar("child_id").notNull(),
});

export const children = pgTable("children", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  birthday: text("birthday"),
  viewMode: text("view_mode").default("device"),
  age: integer("age"),
});

export const insertMemorySchema = createInsertSchema(memories).omit({ id: true });
export const insertChildSchema = createInsertSchema(children).omit({ id: true });

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
