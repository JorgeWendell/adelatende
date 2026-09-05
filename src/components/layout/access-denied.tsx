import Link from "next/link";

export function AccessDenied({
  title,
  homeHref = "/dashboard",
}: {
  title: string;
  homeHref?: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border p-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Sem acesso
      </p>
      <h1 className="mt-2 font-heading text-2xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu perfil neste módulo é{" "}
        <span className="font-medium text-foreground">negado</span>. Peça ao
        administrador da empresa para liberar em Cadastros → Usuários.
      </p>
      <Link
        href={homeHref}
        className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
      >
        Voltar
      </Link>
    </div>
  );
}
