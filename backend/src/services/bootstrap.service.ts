import { eq } from "drizzle-orm";

import { ADMIN_PASSWORD, ADMIN_USERNAME, TEAM_COUNT_PER_DAY } from "../constants/auth";
import { dayEnum } from "../constants/days";
import type { Day } from "../types/app";
import { nowEpochSeconds } from "../utils/validation";
import { hashPassword } from "./crypto.service";
import { admins, teams } from "../db/schema";
import type { Database } from "../db/client";

export const ensureBootstrapData = async (db: Database): Promise<void> => {
  const existingAdmin = await db.query.admins.findFirst({
    where: eq(admins.username, ADMIN_USERNAME),
  });

  if (!existingAdmin) {
    await db
      .insert(admins)
      .values({
        username: ADMIN_USERNAME,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        createdAt: nowEpochSeconds(),
      })
      .onConflictDoNothing({ target: admins.username });
  }

  for (const day of dayEnum) {
    const existingDayTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.day, day));

    // Seed defaults only when a day has no teams at all.
    // Otherwise, preserve manual admin changes (e.g. deletions).
    if (existingDayTeams.length > 0) {
      continue;
    }

    const teamsToInsert: Array<{ day: Day; name: string; createdAt: number }> = [];

    for (let index = 0; index < TEAM_COUNT_PER_DAY; index += 1) {
      teamsToInsert.push({
        day,
        name: `Team ${index + 1}`,
        createdAt: nowEpochSeconds(),
      });
    }

    await db.insert(teams).values(teamsToInsert);
  }
};
