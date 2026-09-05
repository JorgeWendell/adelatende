"use client";

import { Loader2, Plus, QrCode, Trash2, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createConexao,
  deleteConexao,
  disconnectConexao,
  listConexoes,
  refreshQr,
  saveConexao,
} from "@/actions/conexoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatPhone } from "@/lib/phone";

type Connection = {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  qrCode: string | null;
  defaultQueueId: string | null;
};

type Queue = { id: string; name: string; color: string };

export function ConexoesBoard() {
  const [rows, setRows] = useState<Connection[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [queueId, setQueueId] = useState("");
  const [qrFor, setQrFor] = useState<Connection | null>(null);
  const [editFor, setEditFor] = useState<Connection | null>(null);

  const load = useCallback(async () => {
    const result = await listConexoes();
    setLoading(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setRows((result.data?.connections as Connection[]) ?? []);
    setQueues((result.data?.queues as Queue[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await createConexao({
      name,
      defaultQueueId: queueId || undefined,
    });
    setSaving(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    toast.success("Conexão criada. Escaneie o QR Code.");
    setCreating(false);
    setName("");
    setQueueId("");
    await load();
    const created = (await listConexoes()).data?.connections.find(
      (item) => item.id === result.data?.id
    );
    if (created) setQrFor(created as Connection);
  }

  async function handleRefreshQr(row: Connection) {
    const result = await refreshQr({ id: row.id });
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    await load();
    setQrFor({ ...row, qrCode: result.data?.qrCode ?? row.qrCode });
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Conexões</h1>
          <p className="text-sm text-muted-foreground">
            Pareie números WhatsApp pela Evolution API.
          </p>
        </div>
        <Button className="h-9 px-3" onClick={() => setCreating(true)}>
          <Plus />
          Nova conexão
        </Button>
      </div>

      {loading ? (
        <p className="rounded-xl border px-3 py-10 text-center text-sm text-muted-foreground">
          Carregando...
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border px-4 py-12 text-center">
          <p className="font-medium">Nenhuma conexão</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie a primeira instância e escaneie o QR no celular.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const open = row.status === "open";
            return (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.phone ? formatPhone(row.phone) : "Número ainda não pareado"}
                    </p>
                  </div>
                  <Badge variant={open ? "secondary" : "outline"}>
                    {open ? (
                      <Wifi className="size-3.5" />
                    ) : (
                      <WifiOff className="size-3.5" />
                    )}
                    {open ? "Conectado" : row.status === "connecting" ? "Pareando" : "Desconectado"}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => setEditFor(row)}
                  >
                    Configurar
                  </Button>
                  {open ? (
                    <Button
                      variant="outline"
                      className="h-8 px-2"
                      onClick={async () => {
                        const result = await disconnectConexao({ id: row.id });
                        if (result.serverError) toast.error(result.serverError);
                        else toast.success("Desconectado.");
                        await load();
                      }}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      className="h-8 px-2"
                      onClick={() => handleRefreshQr(row)}
                    >
                      <QrCode />
                      Conectar
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="h-8 px-2"
                    onClick={async () => {
                      const result = await deleteConexao({ id: row.id });
                      if (result.serverError) toast.error(result.serverError);
                      else toast.success("Conexão removida.");
                      await load();
                    }}
                  >
                    <Trash2 />
                    Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conexão</DialogTitle>
            <DialogDescription>
              Uma instância é criada na Evolution e o QR aparece em seguida.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="conn-name">Nome</FieldLabel>
                <Input
                  id="conn-name"
                  className="h-9"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="WhatsApp Comercial"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="conn-queue">Fila padrão</FieldLabel>
                <NativeSelect
                  id="conn-queue"
                  className="h-9"
                  value={queueId}
                  onChange={(event) => setQueueId(event.target.value)}
                >
                  <option value="">Sem fila</option>
                  {queues.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="h-9 px-4">
                {saving ? <Loader2 className="animate-spin" /> : null}
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editFor)} onOpenChange={(next) => !next && setEditFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar conexão</DialogTitle>
          </DialogHeader>
          {editFor ? (
            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await saveConexao({
                  id: editFor.id,
                  name: editFor.name,
                  defaultQueueId: editFor.defaultQueueId || undefined,
                });
                if (result.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success("Conexão atualizada.");
                setEditFor(null);
                await load();
              }}
            >
              <Field>
                <FieldLabel>Nome</FieldLabel>
                <Input
                  className="h-9"
                  value={editFor.name}
                  onChange={(event) =>
                    setEditFor({ ...editFor, name: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Fila padrão</FieldLabel>
                <NativeSelect
                  className="h-9"
                  value={editFor.defaultQueueId ?? ""}
                  onChange={(event) =>
                    setEditFor({
                      ...editFor,
                      defaultQueueId: event.target.value || null,
                    })
                  }
                >
                  <option value="">Sem fila</option>
                  {queues.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <DialogFooter>
                <Button type="submit" className="h-9 px-4">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qrFor)} onOpenChange={(next) => !next && setQrFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parear {qrFor?.name}</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no celular → Aparelhos conectados → Conectar um
              aparelho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid place-items-center gap-3 py-2">
            {qrFor?.qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrFor.qrCode}
                alt="QR Code WhatsApp"
                className="size-64 rounded-xl border bg-white p-2"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Gerando QR Code...
              </p>
            )}
            <Button
              variant="outline"
              className="h-8"
              onClick={() => qrFor && handleRefreshQr(qrFor)}
            >
              Atualizar QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
