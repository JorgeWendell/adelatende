"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cadastros } from "@/config/cadastros";
import { cn } from "@/lib/utils";

export function CadastrosNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      <Link
        href="/cadastros"
        className={cn(
          "rounded-lg px-2.5 py-1.5 text-sm",
          pathname === "/cadastros"
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        Início
      </Link>
      {cadastros.map((item) => {
        const href = `/cadastros/${item.slug}`;
        const active = pathname === href;

        return (
          <Link
            key={item.slug}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
