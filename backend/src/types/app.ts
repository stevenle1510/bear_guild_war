export type Env = {
  backend: D1Database;
};

export type AppVariables = {
  adminId: number;
};

export type HonoEnv = {
  Bindings: Env;
  Variables: AppVariables;
};

export type Day = "Saturday" | "Sunday";

export type RegistrationInput = {
  name?: unknown;
  role?: unknown;
  primary_class?: unknown;
  primaryClass?: unknown;
  secondary_class?: unknown;
  secondaryClass?: unknown;
  primary_role?: unknown;
  secondary_role?: unknown;
  note?: unknown;
  participations?: unknown;
  time_slot?: unknown;
  day?: unknown;
};
