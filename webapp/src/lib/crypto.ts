// AES-256-GCM encryption for tokens at rest, keyed from AUTH_SECRET so no
// extra env var is needed. Uses Web Crypto so it bundles cleanly for both the
// Node serverless runtime and the Edge middleware import graph.
// Output format: base64(iv).base64(ciphertext+tag)

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${b64encode(iv)}.${b64encode(data)}`;
}

export async function decrypt(payload: string): Promise<string | null> {
  try {
    const [ivB64, dataB64] = payload.split(".");
    if (!ivB64 || !dataB64) return null;
    const key = await getKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(ivB64) as BufferSource },
      key,
      b64decode(dataB64) as BufferSource
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
