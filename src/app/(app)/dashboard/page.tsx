import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageCircle, Users } from "lucide-react";

import { getDashboardStats } from "@/actions/relatorios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { erpModules } from "@/config/modules";
import { allowedModuleSlugs, getAccessForSession, homePath } from "@/lib/access";

export const metadata: Metadata = {
  title: "Painel",
};

export default async function DashboardPage() {
  const access = await getAccessForSession();
  const allowed = access ? allowedModuleSlugs(access) : [];
  if (access && allowed.length === 1) {
    redirect(homePath(access));
  }
  const visible = erpModules.filter((item) => allowed.includes(item.slug));
  const stats = await getDashboardStats();
  const data = stats.data;

  return (
    <div className="mx-auto grid max-w-7xl gap-8">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Fila de atendimento e atalhos das áreas liberadas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/atendimento"
          className="overflow-hidden rounded-xl border transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Aguardando
            </p>
            <Inbox className="size-4 text-muted-foreground" />
          </div>
          <div className="p-4">
            <p className="font-heading text-3xl tracking-tight">{data?.waiting ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">Tickets sem atendente</p>
          </div>
        </Link>
        <Link
          href="/atendimento"
          className="overflow-hidden rounded-xl border transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Abertos
            </p>
            <MessageCircle className="size-4 text-muted-foreground" />
          </div>
          <div className="p-4">
            <p className="font-heading text-3xl tracking-tight">{data?.open ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">Em atendimento</p>
          </div>
        </Link>
        <Link
          href="/atendimento"
          className="overflow-hidden rounded-xl border transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Não lidas
            </p>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <div className="p-4">
            <p className="font-heading text-3xl tracking-tight">{data?.unread ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">Mensagens pendentes</p>
          </div>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atalhos</CardTitle>
          <CardDescription>
            Só aparecem as áreas liberadas para o seu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.code}</p>
                  <p className="text-sm font-medium">{item.title}</p>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
