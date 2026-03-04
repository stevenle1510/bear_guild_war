import { Hono } from "hono";

import {
  createRegistrationController,
  healthController,
  listRegistrationsController,
  listTeamsController,
} from "../controllers/public.controller";
import type { HonoEnv } from "../types/app";

const publicRoutes = new Hono<HonoEnv>();

publicRoutes.get("/", healthController);
publicRoutes.post("/registrations", createRegistrationController);
publicRoutes.get("/registrations", listRegistrationsController);
publicRoutes.get("/teams", listTeamsController);

export default publicRoutes;
