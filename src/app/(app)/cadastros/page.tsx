import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cadastros } from "@/config/cadastros";

export const metadata: Metadata = {
  title: "Cadastros",
};

export default function CadastrosPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Cadastros</h1>
        <p className="text-sm text-muted-foreground">
          Empresa e usuários do painel de atendimento.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cadastros.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.slug} href={`/cadastros/${item.slug}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
