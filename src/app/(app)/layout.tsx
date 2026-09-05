import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { allowedModuleSlugs, getAccessForSession, homePath } from "@/lib/access";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const organizationId = session.session.activeOrganizationId;

  if (!organizationId) {
    redirect("/onboarding");
  }

  const [company] = await db
    .select({ name: organization.name, tradeName: organization.tradeName })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const access = await getAccessForSession();
  const allowed = access ? allowedModuleSlugs(access) : [];
  const pathname = (await headers()).get("x-pathname") ?? "";
  const flush = pathname.startsWith("/atendimento");

  return (
    <AppShell
      companyName={company?.tradeName || company?.name || "Empresa"}
      userName={session.user.name}
      userEmail={session.user.email}
      allowedModules={allowed}
      homeHref={access ? homePath(access) : "/dashboard"}
      flush={flush}
    >
      {children}
    </AppShell>
  );
}
