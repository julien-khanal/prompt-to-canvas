import { db } from "@/lib/db/schema";

const MASTER_META_ID = "master-salt";
const DEVICE_KEY_STORAGE = "promptcanvas.deviceKey";

async function getOrCreateSalt(): Promise<Uint8Array> {
  const existing = await db().meta.get(MASTER_META_ID);
  if (existing && existing.value instanceof Uint8Array) return existing.value;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await db().meta.put({ id: MASTER_META_ID, value: salt });
  return salt;
}

function getOrCreateDeviceKey(): string {
  if (typeof window === "undefined") return "ssr";
  let key = window.localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    key = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(DEVICE_KEY_STORAGE, key);
  }
  return key;
}

function legacyBrowserFingerprint(): string {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const parts = [
    nav?.userAgent ?? "",
    nav?.language ?? "",
    typeof screen !== "undefined" ? `${screen.width}x${screen.height}x${screen.colorDepth}` : "",
    new Date().getTimezoneOffset().toString(),
  ];
  return parts.join("|");
}

async function deriveKeyFrom(passphrase: string): Promise<CryptoKey> {
  const salt = await getOrCreateSalt();
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 120_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function deriveMasterKey(): Promise<CryptoKey> {
  return deriveKeyFrom(getOrCreateDeviceKey());
}

async function deriveLegacyKey(): Promise<CryptoKey> {
  return deriveKeyFrom(legacyBrowserFingerprint());
}

export async function encryptString(plain: string): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> {
  const key = await deriveMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain) as BufferSource
  );
  return { ciphertext, iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer };
}

export async function decryptString(ciphertext: ArrayBuffer, iv: ArrayBuffer): Promise<string> {
  const key = await deriveMasterKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

export async function putKey(id: string, value: string): Promise<void> {
  const { ciphertext, iv } = await encryptString(value);
  await db().keys.put({ id, ciphertext, iv, updatedAt: Date.now() });
}

export async function getKey(id: string): Promise<string | null> {
  const rec = await db().keys.get(id);
  if (!rec) return null;
  try {
    return await decryptString(rec.ciphertext, rec.iv);
  } catch {
    try {
      const legacy = await deriveLegacyKey();
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(rec.iv) as BufferSource },
        legacy,
        rec.ciphertext
      );
      const value = new TextDecoder().decode(plain);
      await putKey(id, value);
      return value;
    } catch {
      return null;
    }
  }
}

export async function deleteKey(id: string): Promise<void> {
  await db().keys.delete(id);
}

export async function hasKey(id: string): Promise<boolean> {
  return (await db().keys.get(id)) != null;
}
