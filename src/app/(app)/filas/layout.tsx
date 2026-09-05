import { ModuleGate } from "@/components/layout/module-gate";

export default function FilasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleGate slug="filas">{children}</ModuleGate>;
}
