import { SignJWT, jwtVerify } from "jose";

export type JwtPayload = {
  sub: string;
  email: string;
};

const COOKIE_NAME = "auth_token";

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayload, expiresIn = "7d"): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  const sub = payload.sub;
  const email = payload.email;
  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub, email };
}

export { COOKIE_NAME };
