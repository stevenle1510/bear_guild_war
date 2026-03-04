import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { classEnum, dayEnum, roleEnum, timeSlotEnum } from "../constants";
import { guildWarRegistrations, registrationTimeSlots } from "../db/schema";
import type { Database } from "../db/client";
import type { RegistrationInput } from "../types/app";
import {
  asOptionalTrimmedString,
  asTrimmedString,
  assertInEnum,
  nowEpochSeconds,
} from "../utils/validation";

type Participation = {
  day: (typeof dayEnum)[number];
  timeSlots: Array<(typeof timeSlotEnum)[number]>;
};

function parseClassPair(
  value: unknown,
  fieldName: string,
  required: true,
): [typeof classEnum[number], typeof classEnum[number]];
function parseClassPair(
  value: unknown,
  fieldName: string,
  required: false,
): [typeof classEnum[number], typeof classEnum[number]] | null;
function parseClassPair(
  value: unknown,
  fieldName: string,
  required: boolean,
): [typeof classEnum[number], typeof classEnum[number]] | null {
  if (value === undefined || value === null) {
    if (required) {
      throw new HTTPException(400, {
        message: `${fieldName} is required and must be an array with exactly 2 class values`,
      });
    }

    return null;
  }

  if (!Array.isArray(value) || value.length !== 2) {
    throw new HTTPException(400, {
      message: `${fieldName} must be an array with exactly 2 class values`,
    });
  }

  const firstRaw = asTrimmedString(value[0]);
  const secondRaw = asTrimmedString(value[1]);

  if (!firstRaw || !secondRaw) {
    throw new HTTPException(400, {
      message: `${fieldName} items must be non-empty strings`,
    });
  }

  return [
    assertInEnum(firstRaw, classEnum, `${fieldName}[0]`),
    assertInEnum(secondRaw, classEnum, `${fieldName}[1]`),
  ];
}

const serializeClassPair = (
  classPair: [typeof classEnum[number], typeof classEnum[number]],
): string => JSON.stringify(classPair);

const parseStoredClassPair = (
  value: string | null,
  fieldName: string,
): [string, string] | null => {
  if (value === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed) && parsed.length === 2) {
      const first = typeof parsed[0] === "string" ? parsed[0] : null;
      const second = typeof parsed[1] === "string" ? parsed[1] : null;

      if (first && second) {
        return [first, second];
      }
    }
  } catch {
    // Keep backward compatibility for old scalar storage.
  }

  const normalized = asTrimmedString(value);

  if (!normalized) {
    throw new HTTPException(500, {
      message: `Invalid stored ${fieldName} value`,
    });
  }

  return [normalized, normalized];
};

const normalizeParticipations = (body: RegistrationInput): Participation[] => {
  const rawParticipations = body.participations;

  if (Array.isArray(rawParticipations)) {
    if (rawParticipations.length === 0) {
      throw new HTTPException(400, {
        message: "participations must include at least one day entry",
      });
    }

    const seenDays = new Set<string>();

    return rawParticipations.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new HTTPException(400, {
          message: `participations[${index}] must be an object`,
        });
      }

      const dayValue = asTrimmedString((item as { day?: unknown }).day);
      const timeSlotsValue = (item as { time_slots?: unknown }).time_slots;

      if (!dayValue || !Array.isArray(timeSlotsValue) || timeSlotsValue.length === 0) {
        throw new HTTPException(400, {
          message: `participations[${index}] requires day and non-empty time_slots`,
        });
      }

      const day = assertInEnum(dayValue, dayEnum, `participations[${index}].day`);

      if (seenDays.has(day)) {
        throw new HTTPException(400, {
          message: `Duplicate day in participations: ${day}`,
        });
      }
      seenDays.add(day);

      const timeSlots = Array.from(
        new Set(
          timeSlotsValue.map((slot, slotIndex) => {
            const slotValue = asTrimmedString(slot);

            if (!slotValue) {
              throw new HTTPException(400, {
                message: `participations[${index}].time_slots[${slotIndex}] must be a string`,
              });
            }

            return assertInEnum(
              slotValue,
              timeSlotEnum,
              `participations[${index}].time_slots[${slotIndex}]`,
            );
          }),
        ),
      );

      return { day, timeSlots };
    });
  }

  const timeSlotRaw = asTrimmedString(body.time_slot);
  const dayRaw = asTrimmedString(body.day);

  if (!timeSlotRaw || !dayRaw) {
    throw new HTTPException(400, {
      message:
        "Either use participations[] or provide legacy day and time_slot fields",
    });
  }

  return [
    {
      day: assertInEnum(dayRaw, dayEnum, "day"),
      timeSlots: [assertInEnum(timeSlotRaw, timeSlotEnum, "time_slot")],
    },
  ];
};

export const createRegistration = async (
  db: Database,
  body: RegistrationInput,
): Promise<number[]> => {
  const name = asTrimmedString(body.name);
  const role = asTrimmedString(body.role);
  const primaryClassRaw = body.primaryClass ?? body.primary_class;
  const secondaryClassRaw = body.secondaryClass ?? body.secondary_class;
  const primaryRole = asTrimmedString(body.primary_role);
  const secondaryRole = asOptionalTrimmedString(body.secondary_role);
  const note = asOptionalTrimmedString(body.note);

  if (!name || !role || !primaryRole) {
    throw new HTTPException(400, {
      message: "name, role, primaryClass, and primary_role are required",
    });
  }

  const normalizedRole = assertInEnum(role, roleEnum, "role");
  const primaryClass = parseClassPair(primaryClassRaw, "primaryClass", true);
  const secondaryClass = parseClassPair(secondaryClassRaw, "secondaryClass", false);
  const participations = normalizeParticipations(body);
  const registrationIds: number[] = [];

  for (const participation of participations) {
    const inserted = await db
      .insert(guildWarRegistrations)
      .values({
        name,
        role: normalizedRole,
        primaryClass: serializeClassPair(primaryClass),
        secondaryClass: secondaryClass ? serializeClassPair(secondaryClass) : null,
        primaryRole,
        secondaryRole,
        note,
        timeSlot: participation.timeSlots[0],
        day: participation.day,
        teamId: null,
        createdAt: nowEpochSeconds(),
      })
      .returning({ id: guildWarRegistrations.id });

    const registrationId = inserted[0]?.id;

    if (!registrationId) {
      throw new HTTPException(500, {
        message: "Failed to create registration",
      });
    }

    registrationIds.push(registrationId);

    await db.insert(registrationTimeSlots).values(
      participation.timeSlots.map((timeSlot) => ({
        registrationId,
        timeSlot,
      })),
    );
  }

  return registrationIds;
};

export const listRegistrations = async (
  db: Database,
  dayRaw?: string,
  assignment = "all",
) => {
  if (!["all", "assigned", "unassigned"].includes(assignment)) {
    throw new HTTPException(400, {
      message: "assignment must be one of: all, assigned, unassigned",
    });
  }

  const conditions = [];

  if (dayRaw) {
    conditions.push(eq(guildWarRegistrations.day, assertInEnum(dayRaw, dayEnum, "day")));
  }

  if (assignment === "assigned") {
    conditions.push(isNotNull(guildWarRegistrations.teamId));
  }

  if (assignment === "unassigned") {
    conditions.push(isNull(guildWarRegistrations.teamId));
  }

  const rows = await db
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
      createdAt: guildWarRegistrations.createdAt,
    })
    .from(guildWarRegistrations)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const registrationIds = rows.map((row) => row.id);
  const slots =
    registrationIds.length > 0
      ? await db
          .select({
            registrationId: registrationTimeSlots.registrationId,
            timeSlot: registrationTimeSlots.timeSlot,
          })
          .from(registrationTimeSlots)
          .where(inArray(registrationTimeSlots.registrationId, registrationIds))
      : [];

  const slotMap = new Map<number, string[]>();

  for (const slot of slots) {
    const existing = slotMap.get(slot.registrationId) ?? [];
    existing.push(slot.timeSlot);
    slotMap.set(slot.registrationId, existing);
  }

  return rows.map((row) => ({
    ...row,
    primaryClass: parseStoredClassPair(row.primaryClass, "primaryClass"),
    secondaryClass: parseStoredClassPair(row.secondaryClass, "secondaryClass"),
    timeSlots: slotMap.get(row.id) ?? [row.timeSlot],
  }));
};
