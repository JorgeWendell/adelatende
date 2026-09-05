"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { member, organization } from "@/db/schema";
import { auth } from "@/lib/auth";
import { joinCompanyByEmailDomain } from "@/lib/company-membership";
import {
  getEmailDomain,
  isPublicEmailDomain,
  slugify,
} from "@/lib/email-domain";
import { ActionError, protectedAction } from "@/lib/safe-action";

const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Informe a razão social."),
  tradeName: z.string().trim().optional(),
  document: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export const getOnboardingStatus = protectedAction.action(async ({ ctx }) => {
  const userId = ctx.session.user.id;
  const email = ctx.session.user.email;
  const domain = getEmailDomain(email);
  const isPublic = isPublicEmailDomain(domain);

  if (ctx.session.session.activeOrganizationId) {
    return { status: "ready" as const, domain, isPublic };
  }

  const joined = await joinCompanyByEmailDomain(userId, email);

  if (joined) {
    await auth.api.setActiveOrganization({
      body: { organizationId: joined.id },
      headers: await headers(),
    });
    return { status: "ready" as const, domain, isPublic };
  }

  return {
    status: "needs-company" as const,
    domain,
    isPublic,
  };
});

export const createCompany = protectedAction
  .inputSchema(createCompanySchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.session.user.id;
    const email = ctx.session.user.email;
    const domain = getEmailDomain(email);
    const isPublic = isPublicEmailDomain(domain);

    const [existingMembership] = await db
      .select()
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1);

    if (existingMembership) {
      await auth.api.setActiveOrganization({
        body: { organizationId: existingMembership.organizationId },
        headers: await headers(),
      });
      return { status: "joined" as const };
    }

    if (domain && !isPublic) {
      const [existingCompany] = await db
        .select()
        .from(organization)
        .where(eq(organization.emailDomain, domain))
        .limit(1);

      if (existingCompany) {
        const joined = await joinCompanyByEmailDomain(userId, email);
        if (joined) {
          await auth.api.setActiveOrganization({
            body: { organizationId: joined.id },
            headers: await headers(),
          });
          return { status: "joined" as const };
        }
      }
    }

    const baseSlug = slugify(parsedInput.name) || "empresa";
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    const emailDomain = isPublic || !domain ? `personal:${userId}` : domain;

    const created = await auth.api.createOrganization({
      body: {
        name: parsedInput.name,
        slug,
        emailDomain,
        document: parsedInput.document || undefined,
        tradeName: parsedInput.tradeName || undefined,
        phone: parsedInput.phone || undefined,
      },
      headers: await headers(),
    });

    if (!created) {
      throw new ActionError("Não foi possível criar a empresa.");
    }

    return { status: "created" as const };
  });
