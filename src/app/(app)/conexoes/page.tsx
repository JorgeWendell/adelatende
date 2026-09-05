import type { Metadata } from "next";

import { ConexoesBoard } from "@/components/conexoes/conexoes-board";

export const metadata: Metadata = {
  title: "Conexões",
};

export default function ConexoesPage() {
  return <ConexoesBoard />;
}
