import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME, type JwtPayload } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/server/errors";

export async function requireAuth(request: NextRequest): Promise<JwtPayload> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new UnauthorizedError();
  try {
    return await verifyToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }
}
