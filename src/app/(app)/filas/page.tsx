import type { Metadata } from "next";

import { FilasBoard } from "@/components/filas/filas-board";

export const metadata: Metadata = {
  title: "Filas",
};

export default function FilasPage() {
  return <FilasBoard />;
}
