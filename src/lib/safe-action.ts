import { createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";

import type { ModuleProfile } from "@/config/modules";
import { hasMinProfile, loadAccess } from "@/lib/access";
import { auth } from "@/lib/auth";

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }

    console.error(error);
    return "Não foi possível concluir a operação.";
  },
});

export const protectedAction = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new ActionError("Sessão expirada. Entre novamente.");
  }

  return next({ ctx: { session } });
});

export const tenantAction = protectedAction.use(async ({ next, ctx }) => {
  const organizationId = ctx.session.session.activeOrganizationId;

  if (!organizationId) {
    throw new ActionError("Nenhuma empresa ativa na sessão.");
  }

  return next({ ctx: { ...ctx, organizationId } });
});

export function moduleAction(
  moduleSlug: string,
  minProfile: ModuleProfile = "usuario"
) {
  return tenantAction.use(async ({ next, ctx }) => {
    const access = await loadAccess(ctx.organizationId, ctx.session.user.id);
    if (!access) {
      throw new ActionError("Usuário sem vínculo com a empresa.");
    }
    const profile =
      access.grants.find((item) => item.slug === moduleSlug)?.profile ?? "negado";
    const effective =
      access.companyRole === "owner" ? "administrador" : profile;
    if (!hasMinProfile(effective, minProfile)) {
      throw new ActionError("Você não tem acesso a este módulo.");
    }
    return next({
      ctx: { ...ctx, moduleSlug, moduleProfile: effective, access },
    });
  });
}
