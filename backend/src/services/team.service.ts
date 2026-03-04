import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { dayEnum } from "../constants";
import { guildWarRegistrations, registrationTimeSlots, teams } from "../db/schema";
import type { Database } from "../db/client";
import { assertInEnum, nowEpochSeconds } from "../utils/validation";

const parseStoredClassPair = (
  value: string | null,
): [string, string] | null => {
  if (value === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "string" &&
      typeof parsed[1] === "string"
    ) {
      return [parsed[0], parsed[1]];
    }
  } catch {
    // Keep backward compatibility for old scalar storage.
  }

  return [value, value];
};

export const getDayTeams = async (db: Database, dayRaw?: string) => {
  if (!dayRaw) {
    throw new HTTPException(400, { message: "day query is required" });
  }

  const day = assertInEnum(dayRaw, dayEnum, "day");

  const dayTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      day: teams.day,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(eq(teams.day, day))
    .orderBy(teams.createdAt, teams.id);

  const teamIds = dayTeams.map((team) => team.id);
  const members =
    teamIds.length > 0
      ? await db
          .select({
            id: guildWarRegistrations.id,
            name: guildWarRegistrations.name,
            role: guildWarRegistrations.role,
            primaryClass: guildWarRegistrations.primaryClass,
            secondaryClass: guildWarRegistrations.secondaryClass,
            primaryRole: guildWarRegistrations.primaryRole,
            secondaryRole: guildWarRegistrations.secondaryRole,
            note: guildWarRegistrations.note,
            timeSlot: guildWarRegistrations.timeSlot,
            day: guildWarRegistrations.day,
            teamId: guildWarRegistrations.teamId,
          })
          .from(guildWarRegistrations)
          .where(
            and(
              eq(guildWarRegistrations.day, day),
              inArray(guildWarRegistrations.teamId, teamIds),
            ),
          )
      : [];

  const memberIds = members.map((member) => member.id);
  const memberSlots =
    memberIds.length > 0
      ? await db
          .select({
            registrationId: registrationTimeSlots.registrationId,
            timeSlot: registrationTimeSlots.timeSlot,
          })
          .from(registrationTimeSlots)
          .where(inArray(registrationTimeSlots.registrationId, memberIds))
      : [];

  const slotMap = new Map<number, string[]>();

  for (const slot of memberSlots) {
    const existing = slotMap.get(slot.registrationId) ?? [];
    existing.push(slot.timeSlot);
    slotMap.set(slot.registrationId, existing);
  }

  return {
    day,
    teams: dayTeams.map((team) => ({
      ...team,
      members: members
        .filter((member) => member.teamId === team.id)
        .map((member) => ({
          ...member,
          primaryClass: parseStoredClassPair(member.primaryClass),
          secondaryClass: parseStoredClassPair(member.secondaryClass),
          timeSlots: slotMap.get(member.id) ?? [member.timeSlot],
        })),
    })),
  };
};

export const assignRegistrationTeam = async (
  db: Database,
  registrationId: number,
  teamId: number | null,
): Promise<void> => {
  const registration = await db.query.guildWarRegistrations.findFirst({
    where: eq(guildWarRegistrations.id, registrationId),
  });

  if (!registration) {
    throw new HTTPException(404, { message: "Registration not found" });
  }

  if (teamId !== null) {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new HTTPException(404, { message: "Team not found" });
    }

    if (team.day !== registration.day) {
      throw new HTTPException(400, {
        message: "Team assignment day must match the registration day",
      });
    }
  }

  await db
    .update(guildWarRegistrations)
    .set({ teamId })
    .where(eq(guildWarRegistrations.id, registrationId));
};

export const createTeam = async (
  db: Database,
  dayRaw: string,
  name: string,
) => {
  const day = assertInEnum(dayRaw, dayEnum, "day");

  const inserted = await db
    .insert(teams)
    .values({
      day,
      name,
      createdAt: nowEpochSeconds(),
    })
    .returning({
      id: teams.id,
      day: teams.day,
      name: teams.name,
      createdAt: teams.createdAt,
    });

  return inserted[0] ?? null;
};

export const updateTeam = async (
  db: Database,
  teamId: number,
  payload: { name?: string },
) => {
  const existing = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const nextName = payload.name ?? existing.name;

  await db
    .update(teams)
    .set({
      name: nextName,
    })
    .where(eq(teams.id, teamId));

  return {
    id: existing.id,
    day: existing.day,
    name: nextName,
    createdAt: existing.createdAt,
  };
};

export const deleteTeam = async (db: Database, teamId: number): Promise<void> => {
  const existing = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  await db
    .update(guildWarRegistrations)
    .set({ teamId: null })
    .where(eq(guildWarRegistrations.teamId, teamId));

  await db.delete(teams).where(eq(teams.id, teamId));
};
