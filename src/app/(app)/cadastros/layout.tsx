import { CadastrosNav } from "@/components/cadastros/cadastros-nav";
import { ModuleGate } from "@/components/layout/module-gate";

export default function CadastrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleGate slug="cadastros">
      <div className="mx-auto grid max-w-6xl gap-5">
        <CadastrosNav />
        {children}
      </div>
    </ModuleGate>
  );
}
