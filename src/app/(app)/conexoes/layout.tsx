import { ModuleGate } from "@/components/layout/module-gate";

export default function ConexoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleGate slug="conexoes">{children}</ModuleGate>;
}
