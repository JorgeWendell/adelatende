"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { erpModules, type ModuleProfile } from "@/config/modules";
import { db } from "@/db";
import { account, member, memberModule, organization, user } from "@/db/schema";
import { applyAccessPreset, canManageUsers, ensureMemberModules } from "@/lib/access";
import { auth } from "@/lib/auth";
import { ActionError, moduleAction } from "@/lib/safe-action";

export const getEmpresa = moduleAction("cadastros").action(async ({ ctx }) => {
  const [company] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, ctx.organizationId))
    .limit(1);

  if (!company) {
    throw new ActionError("Empresa não encontrada.");
  }

  return company;
});

export const saveEmpresa = moduleAction("cadastros")
  .inputSchema(
    z.object({
      name: z.string().trim().min(2, "Informe a razão social."),
      tradeName: z.string().optional(),
      document: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      zip: z.string().optional(),
      address: z.string().optional(),
      addressNumber: z.string().optional(),
      complement: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    await db
      .update(organization)
      .set({
        name: parsedInput.name,
        tradeName: parsedInput.tradeName || null,
        document: parsedInput.document || null,
        phone: parsedInput.phone || null,
        email: parsedInput.email || null,
        zip: parsedInput.zip || null,
        address: parsedInput.address || null,
        addressNumber: parsedInput.addressNumber || null,
        complement: parsedInput.complement || null,
        district: parsedInput.district || null,
        city: parsedInput.city || null,
        state: parsedInput.state || null,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, ctx.organizationId));

    return { ok: true };
  });

export const listUsuarios = moduleAction("cadastros").action(async ({ ctx }) => {
  const rows = await db
    .select({
      memberId: member.id,
      role: member.role,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, ctx.organizationId))
    .orderBy(user.name);

  for (const row of rows) {
    const fallback =
      row.role === "owner"
        ? "administrador"
        : row.role === "admin"
          ? "gestor"
          : "usuario";
    await ensureMemberModules(ctx.organizationId, row.memberId, fallback);
  }

  const grants = await db
    .select({
      memberId: memberModule.memberId,
      moduleSlug: memberModule.moduleSlug,
      profile: memberModule.profile,
    })
    .from(memberModule)
    .where(eq(memberModule.organizationId, ctx.organizationId));

  return {
    canManage: canManageUsers(ctx.access),
    users: rows.map((row) => {
      const mine = grants.filter((item) => item.memberId === row.memberId);
      const bySlug = new Map(mine.map((item) => [item.moduleSlug, item.profile]));
      const modules = erpModules.map((item) => ({
        slug: item.slug,
        title: item.title,
        profile: (row.role === "owner"
          ? "administrador"
          : (bySlug.get(item.slug) ?? "usuario")) as ModuleProfile,
      }));
      return { ...row, modules };
    }),
  };
});

export const saveUsuario = moduleAction("cadastros")
  .inputSchema(
    z.object({
      name: z.string().trim().min(2),
      email: z.email("Informe um e-mail válido."),
      password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
      role: z.enum(["owner", "admin", "member"]).default("member"),
      initialProfile: z
        .enum(["administrador", "gestor", "usuario", "negado"])
        .default("usuario"),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canManageUsers(ctx.access)) {
      throw new ActionError(
        "Somente administrador da empresa ou de Cadastros gerencia usuários."
      );
    }

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, parsedInput.email))
      .limit(1);

    if (existing) {
      throw new ActionError("Já existe um usuário com este e-mail.");
    }

    const context = await auth.$context;
    const hashed = await context.password.hash(parsedInput.password);
    const userId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const now = new Date();

    await db.insert(user).values({
      id: userId,
      name: parsedInput.name,
      email: parsedInput.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(account).values({
      id: crypto.randomUUID(),
      issuer: "local:credential",
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(member).values({
      id: memberId,
      organizationId: ctx.organizationId,
      userId,
      role: parsedInput.role,
      createdAt: now,
    });

    await applyAccessPreset(
      ctx.organizationId,
      memberId,
      "todos",
      parsedInput.initialProfile
    );

    return { id: userId };
  });

export const updateUsuarioRole = moduleAction("cadastros")
  .inputSchema(
    z.object({
      memberId: z.string(),
      role: z.enum(["owner", "admin", "member"]),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canManageUsers(ctx.access)) {
      throw new ActionError(
        "Somente administrador da empresa ou de Cadastros gerencia usuários."
      );
    }
    await db
      .update(member)
      .set({ role: parsedInput.role })
      .where(
        and(
          eq(member.id, parsedInput.memberId),
          eq(member.organizationId, ctx.organizationId)
        )
      );
    return { ok: true };
  });

export const saveModuleAccess = moduleAction("cadastros")
  .inputSchema(
    z.object({
      memberId: z.string(),
      modules: z.array(
        z.object({
          slug: z.string(),
          profile: z.enum(["administrador", "gestor", "usuario", "negado"]),
        })
      ),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canManageUsers(ctx.access)) {
      throw new ActionError(
        "Somente administrador da empresa ou de Cadastros altera módulos."
      );
    }
    const [target] = await db
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(
        and(
          eq(member.id, parsedInput.memberId),
          eq(member.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!target) throw new ActionError("Usuário não encontrado.");
    if (target.role === "owner") {
      throw new ActionError(
        "O administrador da empresa tem acesso total a todos os módulos."
      );
    }

    await ensureMemberModules(ctx.organizationId, target.id, "usuario");
    const now = new Date();
    const allowed = new Set(erpModules.map((item) => item.slug));
    for (const item of parsedInput.modules) {
      if (!allowed.has(item.slug)) continue;
      await db
        .update(memberModule)
        .set({ profile: item.profile, updatedAt: now })
        .where(
          and(
            eq(memberModule.memberId, target.id),
            eq(memberModule.moduleSlug, item.slug),
            eq(memberModule.organizationId, ctx.organizationId)
          )
        );
    }

    return { ok: true };
  });
