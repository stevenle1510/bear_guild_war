import { createRegistration } from "../services/registration.service";
import { listRegistrations } from "../services/registration.service";
import { getDayTeams } from "../services/team.service";
import type { HonoEnv, RegistrationInput } from "../types/app";
import { parseJsonBody } from "../utils/validation";
import { getDb } from "../db/client";

export const healthController = (c: import("hono").Context<HonoEnv>) =>
  c.json({ status: "ok" });

export const createRegistrationController = async (
  c: import("hono").Context<HonoEnv>,
) => {
  const body = await parseJsonBody<RegistrationInput>(c.req.raw);
  const ids = await createRegistration(getDb(c.env), body);

  return c.json(
    {
      ids,
      message: "Registration submitted successfully",
    },
    201,
  );
};

export const listRegistrationsController = async (
  c: import("hono").Context<HonoEnv>,
) => {
  const day = c.req.query("day");
  const assignment = c.req.query("assignment") ?? "all";

  const data = await listRegistrations(getDb(c.env), day, assignment);
  return c.json({ data });
};

export const listTeamsController = async (c: import("hono").Context<HonoEnv>) => {
  const day = c.req.query("day");
  return c.json(await getDayTeams(getDb(c.env), day));
};
