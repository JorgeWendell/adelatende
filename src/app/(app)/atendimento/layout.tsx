import { ModuleGate } from "@/components/layout/module-gate";

export default function AtendimentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleGate slug="atendimento">{children}</ModuleGate>;
}
