"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteFila, listFilas, saveFila } from "@/actions/filas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const COLORS = ["#57adf8", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];

type Queue = {
  id: string;
  name: string;
  color: string;
  greeting: string | null;
  distribution: string;
  maxLoad: number;
  members: string[];
};

type Agent = { userId: string; name: string; email: string };

const empty = {
  name: "",
  color: COLORS[0],
  greeting: "",
  distribution: "manual",
  maxLoad: 0,
  memberIds: [] as string[],
};

export function FilasBoard() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<(typeof empty & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await listFilas();
    setLoading(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setQueues((result.data?.queues as Queue[]) ?? []);
    setAgents((result.data?.agents as Agent[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const result = await saveFila({
      id: modal.id,
      name: modal.name,
      color: modal.color,
      greeting: modal.greeting,
      distribution: modal.distribution as "manual" | "round-robin" | "least-busy",
      maxLoad: modal.maxLoad,
      memberIds: modal.memberIds,
    });
    setSaving(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    toast.success(modal.id ? "Fila atualizada." : "Fila criada.");
    setModal(null);
    await load();
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Filas</h1>
          <p className="text-sm text-muted-foreground">
            Organize atendimentos por setor e vincule agentes.
          </p>
        </div>
        <Button className="h-9 px-3" onClick={() => setModal({ ...empty })}>
          <Plus />
          Nova fila
        </Button>
      </div>

      {loading ? (
        <p className="rounded-xl border px-3 py-10 text-center text-sm text-muted-foreground">
          Carregando...
        </p>
      ) : queues.length === 0 ? (
        <div className="rounded-xl border px-4 py-12 text-center">
          <p className="font-medium">Nenhuma fila criada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie Vendas, Suporte ou o setor que fizer sentido.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {queues.map((queue) => (
            <div key={queue.id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 size-3.5 rounded-full"
                  style={{ backgroundColor: queue.color }}
                />
                <div>
                  <p className="font-medium">{queue.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {queue.distribution === "manual"
                      ? "Distribuição manual"
                      : queue.distribution === "round-robin"
                        ? "Rodízio"
                        : "Menor carga"}
                    {" · "}
                    {queue.members.length} agente(s)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() =>
                    setModal({
                      id: queue.id,
                      name: queue.name,
                      color: queue.color,
                      greeting: queue.greeting ?? "",
                      distribution: queue.distribution,
                      maxLoad: queue.maxLoad,
                      memberIds: queue.members,
                    })
                  }
                >
                  <Pencil />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="h-8 px-2"
                  onClick={async () => {
                    const result = await deleteFila({ id: queue.id });
                    if (result.serverError) toast.error(result.serverError);
                    else toast.success("Fila removida.");
                    await load();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(modal)} onOpenChange={(next) => !next && setModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal?.id ? "Editar fila" : "Nova fila"}</DialogTitle>
          </DialogHeader>
          {modal ? (
            <form onSubmit={handleSave} className="grid gap-4">
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel>Nome</FieldLabel>
                  <Input
                    className="h-9"
                    value={modal.name}
                    onChange={(event) =>
                      setModal({ ...modal, name: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Cor</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="size-8 rounded-md border-2"
                        style={{
                          backgroundColor: color,
                          borderColor:
                            modal.color === color ? "var(--foreground)" : "transparent",
                        }}
                        onClick={() => setModal({ ...modal, color })}
                      />
                    ))}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Distribuição</FieldLabel>
                  <NativeSelect
                    className="h-9"
                    value={modal.distribution}
                    onChange={(event) =>
                      setModal({ ...modal, distribution: event.target.value })
                    }
                  >
                    <option value="manual">Manual</option>
                    <option value="round-robin">Rodízio</option>
                    <option value="least-busy">Menor carga</option>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel>Limite por agente (0 = sem limite)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    className="h-9"
                    value={modal.maxLoad}
                    onChange={(event) =>
                      setModal({
                        ...modal,
                        maxLoad: Number(event.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Saudação</FieldLabel>
                  <Textarea
                    value={modal.greeting}
                    onChange={(event) =>
                      setModal({ ...modal, greeting: event.target.value })
                    }
                    placeholder="Olá, em breve um atendente fala com você."
                  />
                </Field>
                <Field>
                  <FieldLabel>Agentes</FieldLabel>
                  <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border p-2">
                    {agents.map((agent) => {
                      const checked = modal.memberIds.includes(agent.userId);
                      return (
                        <label
                          key={agent.userId}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setModal({
                                ...modal,
                                memberIds: checked
                                  ? modal.memberIds.filter((id) => id !== agent.userId)
                                  : [...modal.memberIds, agent.userId],
                              })
                            }
                          />
                          {agent.name}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="h-9 px-4">
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
