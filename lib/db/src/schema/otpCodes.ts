import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const otpCodesTable = pgTable(
  "otp_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("otp_codes_email_idx").on(t.email),
    index("otp_codes_expires_at_idx").on(t.expiresAt),
  ],
);

export type OtpCode = typeof otpCodesTable.$inferSelect;
export type InsertOtpCode = typeof otpCodesTable.$inferInsert;
