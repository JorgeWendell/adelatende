import { Building2, UserCog, type LucideIcon } from "lucide-react";

export type CadastroFieldType =
  | "text"
  | "textarea"
  | "boolean"
  | "number"
  | "select"
  | "password";

export type CadastroField = {
  name: string;
  label: string;
  type: CadastroFieldType;
  required?: boolean;
  placeholder?: string;
};

export type CadastroDef = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  kind: "empresa" | "usuarios";
};

export const cadastros: CadastroDef[] = [
  {
    slug: "empresas",
    title: "Empresa",
    description: "Dados da empresa logada.",
    icon: Building2,
    kind: "empresa",
  },
  {
    slug: "usuarios",
    title: "Usuários",
    description: "Acesso ao painel e permissão por módulo.",
    icon: UserCog,
    kind: "usuarios",
  },
];

export function getCadastro(slug: string) {
  return cadastros.find((item) => item.slug === slug);
}
