import { HTTPException } from "hono/http-exception";

import { getDb } from "../db/client";
import { loginAdmin, logoutAdmin } from "../services/admin-auth.service";
import { resetGuildWar } from "../services/guild-war.service";
import {
  deleteRegistration,
  listRegistrations,
} from "../services/registration.service";
import {
  assignRegistrationTeam,
  createTeam,
  deleteTeam,
  getDayTeams,
  updateTeam,
} from "../services/team.service";
import { asTrimmedString, parseJsonBody } from "../utils/validation";
import type { HonoEnv } from "../types/app";

export const adminLoginController = async (c: import("hono").Context<HonoEnv>) => {
  const body = await parseJsonBody<{
    username?: unknown;
    password?: unknown;
  }>(c.req.raw);

  const username = asTrimmedString(body.username);
  const password = asTrimmedString(body.password);

  if (!username || !password) {
    throw new HTTPException(400, {
      message: "username and password are required",
    });
  }

  return c.json(await loginAdmin(getDb(c.env), username, password));
};

export const adminLogoutController = async (c: import("hono").Context<HonoEnv>) => {
  const authorization = c.req.header("Authorization");
  const token = authorization!.slice("Bearer ".length).trim();

  await logoutAdmin(getDb(c.env), token);

  return c.json({ success: true });
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

export const assignTeamController = async (c: import("hono").Context<HonoEnv>) => {
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: "Invalid registration id" });
  }

  const body = await parseJsonBody<{ teamId?: unknown }>(c.req.raw);
  const teamIdRaw = body.teamId;
  const isUnassign = teamIdRaw === null;

  if (!isUnassign && !Number.isInteger(teamIdRaw)) {
    throw new HTTPException(400, { message: "teamId must be an integer or null" });
  }

  await assignRegistrationTeam(getDb(c.env), id, isUnassign ? null : (teamIdRaw as number));

  return c.json({ success: true });
};

export const createTeamController = async (c: import("hono").Context<HonoEnv>) => {
  const body = await parseJsonBody<{
    day?: unknown;
    name?: unknown;
  }>(c.req.raw);

  const day = asTrimmedString(body.day);
  const name = asTrimmedString(body.name);

  if (!day || !name) {
    throw new HTTPException(400, {
      message: "day and name are required",
    });
  }

  const team = await createTeam(getDb(c.env), day, name);

  return c.json({ team }, 201);
};

export const updateTeamController = async (c: import("hono").Context<HonoEnv>) => {
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: "Invalid team id" });
  }

  const body = await parseJsonBody<{
    name?: unknown;
  }>(c.req.raw);

  const name = asTrimmedString(body.name);

  if (name === null) {
    throw new HTTPException(400, {
      message: "Provide at least one updatable field: name",
    });
  }

  const team = await updateTeam(getDb(c.env), id, { name: name ?? undefined });

  return c.json({ team });
};

export const deleteTeamController = async (c: import("hono").Context<HonoEnv>) => {
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: "Invalid team id" });
  }

  await deleteTeam(getDb(c.env), id);

  return c.json({ success: true });
};

export const deleteRegistrationController = async (
  c: import("hono").Context<HonoEnv>,
) => {
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(400, { message: "Invalid registration id" });
  }

  await deleteRegistration(getDb(c.env), id);

  return c.json({ success: true });
};

export const resetGuildWarController = async (c: import("hono").Context<HonoEnv>) => {
  await resetGuildWar(getDb(c.env));

  return c.json({
    success: true,
    message: "Guild War data reset completed",
  });
};
