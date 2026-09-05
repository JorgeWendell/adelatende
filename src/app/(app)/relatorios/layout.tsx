import { ModuleGate } from "@/components/layout/module-gate";

export default function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleGate slug="relatorios">{children}</ModuleGate>;
}
