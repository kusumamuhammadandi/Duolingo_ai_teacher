import { createHmac, createPublicKey, createVerify } from "crypto";

function base64urlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString();
}

function base64urlToBase64(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
}

function generateStreamToken(userId: string, secret: string): string {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = base64urlEncode(
    JSON.stringify({ user_id: userId, iat, exp }),
  );
  const signingInput = `${header}.${payload}`;
  const sig = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${signingInput}.${sig}`;
}

function clerkJwksUrl(publishableKey: string): string {
  const parts = publishableKey.split("_");
  if (parts.length < 3 || parts[0] !== "pk") {
    throw new Error("Invalid CLERK publishable key format");
  }
  const host = Buffer.from(parts[2], "base64").toString().replace(/\$$/, "");
  return `https://${host}/.well-known/jwks.json`;
}

async function verifyClerkToken(
  token: string,
  publishableKey: string,
): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { alg?: string; kid?: string };
  let payload: { sub?: string; exp?: number };
  try {
    header = JSON.parse(base64urlDecode(parts[0]));
    payload = JSON.parse(base64urlDecode(parts[1]));
  } catch {
    return null;
  }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  let jwks: { keys: object[] };
  try {
    const res = await fetch(clerkJwksUrl(publishableKey));
    if (!res.ok) return null;
    jwks = await res.json();
  } catch {
    return null;
  }

  const jwk = (jwks.keys as Array<Record<string, unknown>>).find(
    (k) => k.kid === header.kid,
  );
  if (!jwk) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publicKey = createPublicKey({
      key: jwk as any,
      format: "jwk" as any,
    });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    const signatureBase64 = base64urlToBase64(parts[2]);
    const valid = verifier.verify(publicKey, signatureBase64, "base64");
    if (!valid) return null;
  } catch {
    return null;
  }

  return payload.sub ?? null;
}

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const clerkToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!clerkToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return Response.json({ error: "Auth not configured" }, { status: 500 });
  }

  const userId = await verifyClerkToken(clerkToken, publishableKey);
  if (!userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.STREAM_API_SECRET;
  const apiKey = process.env.STREAM_API_KEY;

  if (!secret || !apiKey) {
    return Response.json({ error: "Stream not configured" }, { status: 500 });
  }

  const token = generateStreamToken(userId, secret);
  return Response.json({ token, apiKey });
}
