"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { erpModules } from "@/config/modules";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ allowedModules }: { allowedModules: string[] }) {
  const pathname = usePathname();
  const modules = erpModules.filter((item) => allowedModules.includes(item.slug));
  const items = [
    {
      href: "/dashboard",
      title: "Painel",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    ...modules.map((item) => ({
      href: item.href,
      title: item.title,
      icon: item.icon,
      active: pathname === item.href || pathname.startsWith(`${item.href}/`),
    })),
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="grid h-16 overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                item.active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
