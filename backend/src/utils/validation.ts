import { HTTPException } from "hono/http-exception";

export const parseJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }
};

export const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const asOptionalTrimmedString = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return asTrimmedString(value);
};

export const assertInEnum = <T extends readonly string[]>(
  value: string,
  values: T,
  fieldName: string,
): T[number] => {
  if (!values.includes(value)) {
    throw new HTTPException(400, {
      message: `${fieldName} must be one of: ${values.join(", ")}`,
    });
  }

  return value as T[number];
};

export const nowEpochSeconds = (): number => Math.floor(Date.now() / 1000);
