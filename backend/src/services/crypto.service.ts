const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const timingSafeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
};

const derivePasswordHash = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    256,
  );

  return new Uint8Array(bits);
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const hash = await derivePasswordHash(password, salt, iterations);

  return `pbkdf2-sha256$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
};

export const verifyPassword = async (
  password: string,
  encodedHash: string,
): Promise<boolean> => {
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = encodedHash.split("$");

  if (algorithm !== "pbkdf2-sha256" || !iterationsRaw || !saltRaw || !hashRaw) {
    return false;
  }

  const iterations = Number.parseInt(iterationsRaw, 10);

  if (!Number.isFinite(iterations) || iterations <= 0 || iterations > 100_000) {
    return false;
  }

  const salt = fromBase64(saltRaw);
  const expectedHash = fromBase64(hashRaw);
  const derivedHash = await derivePasswordHash(password, salt, iterations);

  return timingSafeEqual(derivedHash, expectedHash);
};

export const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64(new Uint8Array(digest));
};
