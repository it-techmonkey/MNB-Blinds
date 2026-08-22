import Link from "next/link";
import { SidebarNavLink } from "@/components/SidebarNavLink";
import { LogoutButton } from "@/components/LogoutButton";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { SITE_BRAND } from "@/lib/site";

type NavIcon = "dashboard" | "products" | "clients" | "invoices" | "reports";
type NavItem = { href: string; label: string; icon: NavIcon; match?: "exact" | "prefix" };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/products", label: "Products", icon: "products", match: "prefix" },
  { href: "/clients", label: "Clients", icon: "clients", match: "prefix" },
  { href: "/invoices", label: "Invoices", icon: "invoices", match: "prefix" },
  { href: "/reports", label: "Reports", icon: "reports", match: "prefix" },
];

function NavIconGlyph({ icon }: { icon: NavIcon }) {
  if (icon === "dashboard") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (icon === "products") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4.5 8 12 4l7.5 4L12 12z" />
        <path d="M4.5 8v8L12 20l7.5-4V8M12 12v8" />
      </svg>
    );
  }
  if (icon === "clients") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="11" r="3.2" />
        <path d="M19.5 18a3.2 3.2 0 0 0-2.4-3.1M4.5 18a3.2 3.2 0 0 1 2.4-3.1" />
      </svg>
    );
  }
  if (icon === "invoices") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 19V10M12 19V5M19 19v-6" />
    </svg>
  );
}

function NavBlock({ inverted = false }: { inverted?: boolean }) {
  return NAV_ITEMS.map((item) => (
    <SidebarNavLink key={item.href} href={item.href} match={item.match} inverted={inverted} icon={<NavIconGlyph icon={item.icon} />}>
      {item.label}
    </SidebarNavLink>
  ));
}

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let accountLabel: string | undefined;
  if (session?.sub) {
    const row = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { name: true, email: true },
    });
    accountLabel = row?.name?.trim() || row?.email || session.email;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar text-white md:flex">
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <Link href="/dashboard" className="brand-mark text-[1.02rem] text-white">
            {SITE_BRAND}
          </Link>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Operations</p>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-3 py-6">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">Navigation</p>
          <div className="mt-2 space-y-1.5 overflow-y-auto pr-1">
            <NavBlock inverted />
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-[12px] border border-white/12 bg-white/6 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/92" title={accountLabel}>
                {accountLabel ?? "Admin"}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Admin</p>
            </div>
            <LogoutButton className="!mt-2 !h-9 w-full justify-center rounded-[10px] border border-white/22 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/14" />
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{accountLabel ?? "Admin"}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{SITE_BRAND}</p>
          </div>
          <LogoutButton className="!h-9 !w-auto shrink-0 justify-center rounded-[10px] border border-border bg-card px-3 text-xs text-foreground" />
        </div>
        <div className="-mx-1 mt-3 flex snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => (
            <SidebarNavLink key={item.href} href={item.href} match={item.match} compact icon={<NavIconGlyph icon={item.icon} />}>
              {item.label}
            </SidebarNavLink>
          ))}
        </div>
      </div>

      <div className="md:pl-60">
        <main className="relative px-4 pb-7 pt-4 md:px-6 md:py-7 lg:px-8">
          <div className="mx-auto max-w-[1520px]">
            <div className="dashboard-surface">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
