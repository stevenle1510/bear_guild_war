import { and, eq, gt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { ADMIN_TOKEN_TTL_SECONDS, ADMIN_USERNAME } from "../constants/auth";
import { admins, adminSessions } from "../db/schema";
import type { Database } from "../db/client";
import { nowEpochSeconds } from "../utils/validation";
import { hashToken, verifyPassword } from "./crypto.service";

export const loginAdmin = async (
  db: Database,
  username: string,
  password: string,
): Promise<{ token: string; tokenType: "Bearer"; expiresAt: number }> => {
  if (username !== ADMIN_USERNAME) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const admin = await db.query.admins.findFirst({
    where: eq(admins.username, ADMIN_USERNAME),
  });

  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = nowEpochSeconds() + ADMIN_TOKEN_TTL_SECONDS;

  await db.insert(adminSessions).values({
    adminId: admin.id,
    tokenHash: await hashToken(token),
    createdAt: nowEpochSeconds(),
    expiresAt,
  });

  return { token, tokenType: "Bearer", expiresAt };
};

export const authenticateAdminToken = async (
  db: Database,
  token: string,
): Promise<number> => {
  const tokenHash = await hashToken(token);

  const session = await db.query.adminSessions.findFirst({
    where: and(
      eq(adminSessions.tokenHash, tokenHash),
      gt(adminSessions.expiresAt, nowEpochSeconds()),
    ),
  });

  if (!session) {
    throw new HTTPException(401, { message: "Invalid or expired admin token" });
  }

  return session.adminId;
};

export const logoutAdmin = async (db: Database, token: string): Promise<void> => {
  await db
    .delete(adminSessions)
    .where(eq(adminSessions.tokenHash, await hashToken(token)));
};
