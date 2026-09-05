"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getRelatorio } from "@/actions/relatorios";
import { Input } from "@/components/ui/input";

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function RelatoriosBoard() {
  const [from, setFrom] = useState(isoDate(-13));
  const [to, setTo] = useState(isoDate(0));
  const [data, setData] = useState<{
    sent: number;
    received: number;
    open: number;
    waiting: number;
    closed: number;
    tickets: number;
    daily: { day: string; sent: number; received: number }[];
  } | null>(null);

  useEffect(() => {
    void getRelatorio({ from, to }).then((result) => {
      if (result.serverError) {
        toast.error(result.serverError);
        return;
      }
      setData(result.data ?? null);
    });
  }, [from, to]);

  const max = useMemo(() => {
    return Math.max(1, ...(data?.daily.map((item) => item.sent + item.received) ?? [1]));
  }, [data]);

  const cards = [
    { label: "Enviadas", value: data?.sent ?? 0 },
    { label: "Recebidas", value: data?.received ?? 0 },
    { label: "Abertos", value: data?.open ?? 0 },
    { label: "Aguardando", value: data?.waiting ?? 0 },
    { label: "Encerrados", value: data?.closed ?? 0 },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Mensagens e tickets no período selecionado.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            className="h-9"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            type="date"
            className="h-9"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => (
          <div key={item.label} className="overflow-hidden rounded-xl border">
            <div className="border-b bg-muted/50 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {item.label}
            </div>
            <p className="p-4 font-heading text-3xl tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-4 text-sm font-medium">Tendência diária</p>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
          {(data?.daily ?? []).map((item) => (
            <div key={item.day} className="grid items-end gap-1">
              <div
                className="rounded-sm bg-primary/80"
                style={{ height: `${Math.max(8, ((item.sent + item.received) / max) * 120)}px` }}
                title={`${item.day}: ${item.sent} env. / ${item.received} rec.`}
              />
              <p className="truncate text-[10px] text-muted-foreground">
                {item.day.slice(8)}
              </p>
            </div>
          ))}
        </div>
        {data && data.daily.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem mensagens no período.</p>
        ) : null}
      </div>
    </div>
  );
}
