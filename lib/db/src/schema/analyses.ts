import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  input: text("input").notNull(),
  inputType: text("input_type").notNull().default("unknown"),
  network: text("network").notNull().default("mainnet"),
  summary: text("summary").notNull(),
  verdict: text("verdict").notNull().default("caution"),
  verdictReason: text("verdict_reason").notNull().default(""),
  riskScore: integer("risk_score").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("low"),
  warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
  positives: jsonb("positives").$type<string[]>().notNull().default([]),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  hallOfShame: boolean("hall_of_shame").default(false).notNull(),
  hallOfShameLabel: text("hall_of_shame_label"),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
