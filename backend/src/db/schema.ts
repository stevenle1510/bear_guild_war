import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { roleEnum } from "../constants/roles";

export const admins = sqliteTable(
  "admins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("admins_username_unique").on(table.username)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminId: integer("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("admin_sessions_token_hash_unique").on(table.tokenHash),
    index("admin_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    day: text("day").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("teams_day_idx").on(table.day)],
);

export const guildWarRegistrations = sqliteTable(
  "guild_war_registrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    role: text("role", { enum: roleEnum }).notNull(),
    primaryClass: text("primary_class").notNull(),
    secondaryClass: text("secondary_class"),
    primaryRole: text("primary_role").notNull(),
    secondaryRole: text("secondary_role"),
    note: text("note"),
    timeSlot: text("time_slot").notNull(),
    day: text("day").notNull(),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("registrations_day_idx").on(table.day),
    index("registrations_day_team_idx").on(table.day, table.teamId),
    index("registrations_time_slot_idx").on(table.timeSlot),
  ],
);

export const registrationTimeSlots = sqliteTable(
  "registration_time_slots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => guildWarRegistrations.id, { onDelete: "cascade" }),
    timeSlot: text("time_slot").notNull(),
  },
  (table) => [
    uniqueIndex("registration_time_slots_registration_slot_unique").on(
      table.registrationId,
      table.timeSlot,
    ),
    index("registration_time_slots_registration_idx").on(table.registrationId),
    index("registration_time_slots_slot_idx").on(table.timeSlot),
  ],
);
