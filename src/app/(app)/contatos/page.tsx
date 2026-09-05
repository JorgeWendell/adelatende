import type { Metadata } from "next";

import { ContatosBoard } from "@/components/contatos/contatos-board";

export const metadata: Metadata = {
  title: "Contatos",
};

export default function ContatosPage() {
  return <ContatosBoard />;
}
