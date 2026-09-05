"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

type UserMenuProps = {
  name: string;
  email: string;
  companyName?: string | null;
};

export function UserMenu({ name, email, companyName }: UserMenuProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="h-9 gap-2 px-2" />}
        >
          <Avatar size="sm" className="size-7">
            <AvatarFallback className="text-[11px]">
              {initials || <UserRound className="size-3.5" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-left sm:block">
            {name}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="grid gap-0.5 py-0.5">
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="text-xs">{email}</p>
                {companyName ? (
                  <p className="text-xs text-primary">{companyName}</p>
                ) : null}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={handleSignOut}
          >
            <LogOut />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
