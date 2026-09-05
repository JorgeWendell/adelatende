import { ModuleGate } from "@/components/layout/module-gate";

export default function ContatosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleGate slug="contatos">{children}</ModuleGate>;
}
