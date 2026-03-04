import { Hono } from "hono";

import {
  adminLoginController,
  adminLogoutController,
  assignTeamController,
  createTeamController,
  deleteTeamController,
  listRegistrationsController,
  listTeamsController,
  resetGuildWarController,
  updateTeamController,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/require-admin";
import type { HonoEnv } from "../types/app";

const adminRoutes = new Hono<HonoEnv>();

adminRoutes.post("/login", adminLoginController);

adminRoutes.use("*", requireAdmin);
adminRoutes.post("/logout", adminLogoutController);
adminRoutes.get("/registrations", listRegistrationsController);
adminRoutes.get("/teams", listTeamsController);
adminRoutes.post("/teams", createTeamController);
adminRoutes.patch("/teams/:id", updateTeamController);
adminRoutes.delete("/teams/:id", deleteTeamController);
adminRoutes.patch("/registrations/:id/team", assignTeamController);
adminRoutes.post("/guild-war/reset", resetGuildWarController);

export default adminRoutes;
