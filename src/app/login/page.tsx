import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth/get-session";
import { SITE_BRAND } from "@/lib/site";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel w-full max-w-md">
        <div className="w-full">
          <div className="mb-6 space-y-3">
            <Link href="/login" className="brand-mark text-base text-foreground">
              {SITE_BRAND}
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">Manage products, clients, and invoices.</p>
          </div>
          <Suspense
            fallback={
              <div className="space-y-3">
                <div className="skeleton-bar" />
                <div className="skeleton-bar" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
