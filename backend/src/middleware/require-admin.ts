import { HTTPException } from "hono/http-exception";

import { getDb } from "../db/client";
import { authenticateAdminToken } from "../services/admin-auth.service";
import type { HonoEnv } from "../types/app";

export const requireAdmin = async (
  c: import("hono").Context<HonoEnv>,
  next: () => Promise<void>,
) => {
  const authorization = c.req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing admin token" });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    throw new HTTPException(401, { message: "Missing admin token" });
  }

  const adminId = await authenticateAdminToken(getDb(c.env), token);
  c.set("adminId", adminId);

  await next();
};
