import { and, eq } from "drizzle-orm";
import { cache } from "react";

import {
  defaultProfileFromRole,
  erpModules,
  getModuleBySlug,
  isModuleProfile,
  moduleProfileRank,
  profilesForPreset,
  type AccessPreset,
  type ModuleProfile,
} from "@/config/modules";
import { db } from "@/db";
import { member, memberModule } from "@/db/schema";
import { getSession } from "@/lib/session";

export type ModuleGrant = {
  slug: string;
  title: string;
  profile: ModuleProfile;
};

export type AccessState = {
  memberId: string;
  userId: string;
  organizationId: string;
  companyRole: string;
  isCompanyAdmin: boolean;
  grants: ModuleGrant[];
};

function asProfile(
  value: string | null | undefined,
  fallback: ModuleProfile
): ModuleProfile {
  return value && isModuleProfile(value) ? value : fallback;
}

export async function ensureMemberModules(
  organizationId: string,
  memberId: string,
  fallback: ModuleProfile
) {
  const existing = await db
    .select({ moduleSlug: memberModule.moduleSlug })
    .from(memberModule)
    .where(
      and(
        eq(memberModule.organizationId, organizationId),
        eq(memberModule.memberId, memberId)
      )
    );
  const have = new Set(existing.map((row) => row.moduleSlug));
  const missing = erpModules.filter((item) => !have.has(item.slug));
  if (!missing.length) return;
  const now = new Date();
  await db.insert(memberModule).values(
    missing.map((item) => ({
      id: crypto.randomUUID(),
      organizationId,
      memberId,
      moduleSlug: item.slug,
      profile: fallback,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export async function applyMemberProfiles(
  organizationId: string,
  memberId: string,
  profiles: Record<string, ModuleProfile>
) {
  await ensureMemberModules(organizationId, memberId, "negado");
  const now = new Date();
  for (const item of erpModules) {
    const profile = profiles[item.slug] ?? "negado";
    await db
      .update(memberModule)
      .set({ profile, updatedAt: now })
      .where(
        and(
          eq(memberModule.organizationId, organizationId),
          eq(memberModule.memberId, memberId),
          eq(memberModule.moduleSlug, item.slug)
        )
      );
  }
}

export async function applyAccessPreset(
  organizationId: string,
  memberId: string,
  preset: AccessPreset,
  fallback: ModuleProfile = "usuario"
) {
  await applyMemberProfiles(
    organizationId,
    memberId,
    profilesForPreset(preset, fallback)
  );
}

export async function loadAccess(
  organizationId: string,
  userId: string
): Promise<AccessState | null> {
  const [row] = await db
    .select({
      id: member.id,
      role: member.role,
    })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);
  if (!row) return null;

  const isCompanyAdmin = row.role === "owner" || row.role === "admin";
  const fallback = defaultProfileFromRole(row.role);
  await ensureMemberModules(organizationId, row.id, fallback);

  const rows = await db
    .select({
      moduleSlug: memberModule.moduleSlug,
      profile: memberModule.profile,
    })
    .from(memberModule)
    .where(
      and(
        eq(memberModule.organizationId, organizationId),
        eq(memberModule.memberId, row.id)
      )
    );
  const bySlug = new Map(rows.map((item) => [item.moduleSlug, item.profile]));

  const grants = erpModules.map((item) => {
    const stored = asProfile(bySlug.get(item.slug), fallback);
    const profile = row.role === "owner" ? "administrador" : stored;
    return { slug: item.slug, title: item.title, profile };
  });

  return {
    memberId: row.id,
    userId,
    organizationId,
    companyRole: row.role,
    isCompanyAdmin,
    grants,
  };
}

export function profileOf(access: AccessState, slug: string): ModuleProfile {
  if (access.companyRole === "owner") return "administrador";
  return access.grants.find((item) => item.slug === slug)?.profile ?? "negado";
}

export function hasMinProfile(profile: ModuleProfile, min: ModuleProfile) {
  return moduleProfileRank[profile] >= moduleProfileRank[min];
}

export function canAccessModule(access: AccessState, slug: string) {
  return profileOf(access, slug) !== "negado";
}

export function canManageUsers(access: AccessState) {
  return access.isCompanyAdmin || profileOf(access, "cadastros") === "administrador";
}

export const getAccessForSession = cache(async (): Promise<AccessState | null> => {
  const session = await getSession();
  const organizationId = session?.session.activeOrganizationId;
  if (!session || !organizationId) return null;
  return loadAccess(organizationId, session.user.id);
});

export function allowedModuleSlugs(access: AccessState) {
  return access.grants
    .filter((item) => item.profile !== "negado")
    .map((item) => item.slug);
}

export function homePath(access: AccessState) {
  const slugs = allowedModuleSlugs(access);
  if (slugs.length === 1) {
    return getModuleBySlug(slugs[0])?.href ?? "/dashboard";
  }
  return "/dashboard";
}
