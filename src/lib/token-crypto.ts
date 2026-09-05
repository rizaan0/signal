import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM: 12-byte IV (24 hex), 16-byte auth tag (32 hex), variable ciphertext.
// Format: "enc:" + iv(24 hex) + tag(32 hex) + ciphertext(hex)
// If TOKEN_ENCRYPTION_KEY is not set, tokens are stored/returned as plaintext (dev mode).

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer | null {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) return null;
  return Buffer.from(hex, "hex");
}

export function encryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = getKey();
  if (!key) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return "enc:" + iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("enc:")) return value; // plaintext (no key or legacy)
  const key = getKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY required to decrypt tokens");
  const hex = value.slice(4);
  const iv = Buffer.from(hex.slice(0, 24), "hex");
  const tag = Buffer.from(hex.slice(24, 56), "hex");
  const data = Buffer.from(hex.slice(56), "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return (
    decipher.update(data).toString("utf8") + decipher.final("utf8")
  );
}
