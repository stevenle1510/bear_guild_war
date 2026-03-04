import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { getDb } from "./db/client";
import adminRoutes from "./routes/admin.routes";
import publicRoutes from "./routes/public.routes";
import { ensureBootstrapData } from "./services/bootstrap.service";
import type { HonoEnv } from "./types/app";

const app = new Hono<HonoEnv>();

app.use("*", cors());
app.use("*", async (c, next) => {
  await ensureBootstrapData(getDb(c.env));
  await next();
});

app.route("/", publicRoutes);
app.route("/admin", adminRoutes);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  console.error(error);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
