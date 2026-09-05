"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { erpModules } from "@/config/modules";
import { cn } from "@/lib/utils";

export function AppSidebar({
  allowedModules,
  homeHref,
}: {
  allowedModules: string[];
  homeHref: string;
}) {
  const pathname = usePathname();
  const modules = erpModules.filter((item) => allowedModules.includes(item.slug));
  const showDashboard = allowedModules.length !== 1;

  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex xl:w-72">
      <div className="flex h-16 items-center justify-center border-b px-4">
        <Link href={homeHref} className="flex justify-center">
          <BrandLogo align="center" className="h-7 w-32" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Módulos
        </p>
        {showDashboard ? (
          <Link
            href="/dashboard"
            className={cn(
              "mb-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
            )}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            Painel
          </Link>
        ) : null}
        <div className="grid gap-0.5">
          {modules.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.slug}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
