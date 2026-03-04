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

    const missingCount = TEAM_COUNT_PER_DAY - existingDayTeams.length;

    if (missingCount <= 0) {
      continue;
    }

    const startIndex = existingDayTeams.length + 1;
    const teamsToInsert: Array<{ day: Day; name: string; createdAt: number }> = [];

    for (let index = 0; index < missingCount; index += 1) {
      teamsToInsert.push({
        day,
        name: `Team ${startIndex + index}`,
        createdAt: nowEpochSeconds(),
      });
    }

    await db.insert(teams).values(teamsToInsert);
  }
};
