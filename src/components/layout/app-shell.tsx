import { BrandLogo } from "@/components/brand-logo";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

type AppShellProps = {
  companyName: string;
  userName: string;
  userEmail: string;
  allowedModules: string[];
  homeHref: string;
  flush?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  companyName,
  userName,
  userEmail,
  allowedModules,
  homeHref,
  flush,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar allowedModules={allowedModules} homeHref={homeHref} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-6 lg:h-16 lg:pt-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo className="h-9 w-24 shrink-0 lg:hidden" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{companyName}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Atendimento
              </p>
            </div>
          </div>
          <UserMenu
            name={userName}
            email={userEmail}
            companyName={companyName}
          />
        </header>
        <main
          className={cn(
            "min-h-0 flex-1",
            flush
              ? "overflow-hidden p-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"
              : "overflow-y-auto p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:p-6 lg:pb-6"
          )}
        >
          {children}
        </main>
      </div>
      <MobileBottomNav allowedModules={allowedModules} />
    </div>
  );
}
