import {
  BarChart3,
  Building2,
  Inbox,
  MessageCircle,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AtendeModule = {
  slug: string;
  code: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const atendeModules: AtendeModule[] = [
  {
    slug: "atendimento",
    code: "01",
    title: "Atendimento",
    description: "Inbox de conversas WhatsApp.",
    href: "/atendimento",
    icon: Inbox,
  },
  {
    slug: "contatos",
    code: "02",
    title: "Contatos",
    description: "Agenda sincronizada do WhatsApp.",
    href: "/contatos",
    icon: Users,
  },
  {
    slug: "filas",
    code: "03",
    title: "Filas",
    description: "Setores e distribuição de tickets.",
    href: "/filas",
    icon: MessageCircle,
  },
  {
    slug: "conexoes",
    code: "04",
    title: "Conexões",
    description: "Números WhatsApp e QR Code.",
    href: "/conexoes",
    icon: Smartphone,
  },
  {
    slug: "relatorios",
    code: "05",
    title: "Relatórios",
    description: "Mensagens, tickets e tendência.",
    href: "/relatorios",
    icon: BarChart3,
  },
  {
    slug: "cadastros",
    code: "06",
    title: "Cadastros",
    description: "Empresa e usuários do painel.",
    href: "/cadastros",
    icon: Building2,
  },
];

export function getModuleBySlug(slug: string) {
  return atendeModules.find((item) => item.slug === slug);
}

export type ModuleProfile = "administrador" | "gestor" | "usuario" | "negado";

export const moduleProfiles: { value: ModuleProfile; label: string }[] = [
  { value: "administrador", label: "Administrador" },
  { value: "gestor", label: "Gestor" },
  { value: "usuario", label: "Usuário" },
  { value: "negado", label: "Negado" },
];

export const moduleProfileRank: Record<ModuleProfile, number> = {
  negado: 0,
  usuario: 1,
  gestor: 2,
  administrador: 3,
};

export function isModuleProfile(value: string): value is ModuleProfile {
  return moduleProfiles.some((item) => item.value === value);
}

export function profileLabel(profile: string) {
  return moduleProfiles.find((item) => item.value === profile)?.label ?? profile;
}

export function defaultProfileFromRole(role: string): ModuleProfile {
  if (role === "owner") return "administrador";
  if (role === "admin") return "gestor";
  return "usuario";
}

export type AccessPreset = "todos";

export const accessPresets: {
  value: AccessPreset;
  label: string;
  description: string;
}[] = [
  {
    value: "todos",
    label: "Todos os módulos",
    description: "O perfil inicial vale para Atendimento, Contatos, Filas, Conexões, Relatórios e Cadastros.",
  },
];

export function profilesForPreset(
  _preset: AccessPreset,
  fallback: ModuleProfile = "usuario"
): Record<string, ModuleProfile> {
  return Object.fromEntries(erpModules.map((item) => [item.slug, fallback]));
}

export type ErpModule = AtendeModule;
export const erpModules = atendeModules;
