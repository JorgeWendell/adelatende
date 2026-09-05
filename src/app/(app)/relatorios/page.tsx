import type { Metadata } from "next";

import { RelatoriosBoard } from "@/components/relatorios/relatorios-board";

export const metadata: Metadata = {
  title: "Relatórios",
};

export default function RelatoriosPage() {
  return <RelatoriosBoard />;
}
