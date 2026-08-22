import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/server/errors";

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const token = await signToken({ sub: user.id, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}
