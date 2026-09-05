import type { Metadata } from "next";

import { InboxBoard } from "@/components/atendimento/inbox-board";

export const metadata: Metadata = {
  title: "Atendimento",
};

export default function AtendimentoPage() {
  return <InboxBoard />;
}
