import { dayEnum } from "../constants";
import { guildWarRegistrations, registrationTimeSlots, teams } from "../db/schema";
import type { Database } from "../db/client";
import { TEAM_COUNT_PER_DAY } from "../constants/auth";
import { nowEpochSeconds } from "../utils/validation";

export const resetGuildWar = async (db: Database): Promise<void> => {
  await db.delete(registrationTimeSlots);
  await db.delete(guildWarRegistrations);
  await db.delete(teams);

  const defaultTeams: Array<{ day: (typeof dayEnum)[number]; name: string; createdAt: number }> = [];

  for (const day of dayEnum) {
    for (let index = 1; index <= TEAM_COUNT_PER_DAY; index += 1) {
      defaultTeams.push({
        day,
        name: `Team ${index}`,
        createdAt: nowEpochSeconds(),
      });
    }
  }

  await db.insert(teams).values(defaultTeams);
};
