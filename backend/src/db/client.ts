import { drizzle } from "drizzle-orm/d1";

import type { HonoEnv } from "../types/app";
import * as schema from "./schema";

export const getDb = (bindings: HonoEnv["Bindings"]) => drizzle(bindings.DB, { schema });

export type Database = ReturnType<typeof getDb>;
