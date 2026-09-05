import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmpresaForm } from "@/components/cadastros/empresa-form";
import { UsuariosCadastro } from "@/components/cadastros/usuarios-cadastro";
import { getCadastro } from "@/config/cadastros";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: getCadastro(slug)?.title ?? "Cadastros" };
}

export default async function CadastroSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = getCadastro(slug);

  if (!def) {
    notFound();
  }

  if (def.kind === "empresa") {
    return <EmpresaForm />;
  }

  return <UsuariosCadastro />;
}
