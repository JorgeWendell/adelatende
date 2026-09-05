import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { CreateCompanyDialog } from "@/components/auth/create-company-dialog";
import { auth } from "@/lib/auth";
import { joinCompanyByEmailDomain } from "@/lib/company-membership";
import { getEmailDomain } from "@/lib/email-domain";
import { getSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  const joined = await joinCompanyByEmailDomain(
    session.user.id,
    session.user.email
  );

  if (joined) {
    await auth.api.setActiveOrganization({
      body: { organizationId: joined.id },
      headers: await headers(),
    });
    redirect("/dashboard");
  }

  return (
    <AuthShell>
      <div className="max-w-md space-y-3">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          Onboarding
        </p>
        <h1 className="font-heading text-3xl tracking-tight">Sua empresa</h1>
        <p className="text-sm text-muted-foreground">
          Falta só cadastrar a empresa. Depois disso, qualquer colega com o
          mesmo domínio de e-mail entra direto.
        </p>
      </div>
      <CreateCompanyDialog
        open
        email={session.user.email}
        domain={getEmailDomain(session.user.email)}
      />
    </AuthShell>
  );
}
