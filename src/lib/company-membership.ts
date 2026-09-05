import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { member, organization } from "@/db/schema";
import { getEmailDomain, isPublicEmailDomain } from "@/lib/email-domain";

export async function joinCompanyByEmailDomain(userId: string, email: string) {
  const domain = getEmailDomain(email);

  if (!domain || isPublicEmailDomain(domain)) {
    return null;
  }

  const [company] = await db
    .select()
    .from(organization)
    .where(eq(organization.emailDomain, domain))
    .limit(1);

  if (!company) {
    return null;
  }

  const [existing] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, company.id), eq(member.userId, userId)))
    .limit(1);

  if (!existing) {
    const memberId = crypto.randomUUID();
    await db.insert(member).values({
      id: memberId,
      organizationId: company.id,
      userId,
      role: "member",
      createdAt: new Date(),
    });
    const { ensureMemberModules } = await import("@/lib/access");
    await ensureMemberModules(company.id, memberId, "usuario");
  }

  return company;
}

export async function getMembershipOrganizationId(userId: string) {
  const [row] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);

  return row?.organizationId ?? null;
}
