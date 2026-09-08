"use client";

import { Loader2, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { listConexoes } from "@/actions/conexoes";
import { listContatos, deleteContato, openContatoChat, saveContato } from "@/actions/contatos";
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
import { formatPhone } from "@/lib/phone";

type Contact = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
};

export function ContatosBoard() {
  const router = useRouter();
  const [rows, setRows] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Contact> | null>(null);
  const [saving, setSaving] = useState(false);
  const [chatFor, setChatFor] = useState<Contact | null>(null);
  const [deleteFor, setDeleteFor] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [connectionId, setConnectionId] = useState("");
  const [connections, setConnections] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    const result = await listContatos({ q: q || undefined });
    setLoading(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setRows((result.data as Contact[]) ?? []);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void listConexoes().then((result) => {
      const items = result.data?.connections ?? [];
      setConnections(items.map((item) => ({ id: item.id, name: item.name })));
      if (items[0]) setConnectionId(items[0].id);
    });
  }, []);

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            Agenda do WhatsApp e cadastro manual.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Buscar"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <Button className="h-9 px-3" onClick={() => setModal({})}>
            <Plus />
            Novo
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="rounded-xl border px-3 py-10 text-center text-sm text-muted-foreground">
          Carregando...
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border px-4 py-12 text-center">
          <p className="font-medium">Nenhum contato</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os contatos aparecem quando chegam mensagens ou você cadastra aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">{formatPhone(row.phone)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => setModal(row)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="destructive"
                  className="h-8 px-2"
                  onClick={() => setDeleteFor(row)}
                >
                  <Trash2 />
                </Button>
                <Button className="h-8 px-2" onClick={() => setChatFor(row)}>
                  <MessageCircle />
                  Atender
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(modal)} onOpenChange={(next) => !next && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modal?.id ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          {modal ? (
            <form
              className="grid gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setSaving(true);
                const result = await saveContato({
                  id: modal.id,
                  name: modal.name ?? "",
                  phone: modal.phone ?? "",
                  notes: modal.notes ?? undefined,
                });
                setSaving(false);
                if (result.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success("Contato salvo.");
                setModal(null);
                await load();
              }}
            >
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel>Nome</FieldLabel>
                  <Input
                    className="h-9"
                    value={modal.name ?? ""}
                    onChange={(event) =>
                      setModal({ ...modal, name: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Telefone</FieldLabel>
                  <Input
                    className="h-9"
                    value={modal.phone ?? ""}
                    onChange={(event) =>
                      setModal({ ...modal, phone: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Notas</FieldLabel>
                  <Textarea
                    value={modal.notes ?? ""}
                    onChange={(event) =>
                      setModal({ ...modal, notes: event.target.value })
                    }
                  />
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

      <Dialog open={Boolean(deleteFor)} onOpenChange={(next) => !next && setDeleteFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir contato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir {deleteFor?.name}? As conversas desse contato também saem do
            atendimento.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => setDeleteFor(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-9 px-4"
              disabled={deleting}
              onClick={async () => {
                if (!deleteFor) return;
                setDeleting(true);
                const result = await deleteContato({ id: deleteFor.id });
                setDeleting(false);
                if (result.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success("Contato excluído.");
                setDeleteFor(null);
                await load();
              }}
            >
              {deleting ? <Loader2 className="animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(chatFor)} onOpenChange={(next) => !next && setChatFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir conversa</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!chatFor) return;
              const result = await openContatoChat({
                contactId: chatFor.id,
                connectionId,
              });
              if (result.serverError || !result.data) {
                toast.error(result.serverError || "Não foi possível abrir.");
                return;
              }
              router.push(`/atendimento?c=${result.data.conversationId}`);
            }}
          >
            <Field>
              <FieldLabel>Conexão</FieldLabel>
              <NativeSelect
                className="h-9"
                value={connectionId}
                onChange={(event) => setConnectionId(event.target.value)}
              >
                {connections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <DialogFooter>
              <Button type="submit" className="h-9 px-4">
                Ir para o atendimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
