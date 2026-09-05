import { AccessDenied } from "@/components/layout/access-denied";
import { getModuleBySlug } from "@/config/modules";
import { canAccessModule, getAccessForSession, homePath } from "@/lib/access";

export async function ModuleGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const access = await getAccessForSession();
  if (!access || !canAccessModule(access, slug)) {
    return (
      <AccessDenied
        title={getModuleBySlug(slug)?.title ?? slug}
        homeHref={access ? homePath(access) : "/dashboard"}
      />
    );
  }
  return children;
}
