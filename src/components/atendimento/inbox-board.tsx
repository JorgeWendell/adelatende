"use client";

import {
  CheckCheck,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  listConversas,
  listMensagens,
  listQuickReplies,
  sendMensagem,
  setConversaStatus,
  startConversa,
} from "@/actions/atendimento";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";

type Tab = "open" | "waiting" | "group";

type Conversation = {
  id: string;
  status: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessageAt: Date | string | null;
  lastMessagePreview: string | null;
  assignedUserId: string | null;
  assignedName: string | null;
  connectionId: string;
  connectionName: string;
  contactName: string;
  contactPhone: string;
  contactJid: string;
  contactAvatar: string | null;
};

type Message = {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  createdAt: Date | string;
};

type Connection = { id: string; name: string; status: string; phone: string | null };

export function InboxBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("waiting");
  const [q, setQ] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    searchParams.get("c")
  );
  const [messages, setMessages] = useState<Message[]>([]);
  type ActiveChat = {
    id: string;
    status: string;
    assignedUserId: string | null;
    isGroup: boolean;
    connectionId: string;
    connectionName: string;
    contactId: string;
    contactName: string;
    contactPhone: string;
    contactJid: string;
    contactNotes: string | null;
    contactAvatar: string | null;
  };

  const [active, setActive] = useState<ActiveChat | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replies, setReplies] = useState<{ shortcut: string; body: string }[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const result = await listConversas({
      connectionId: connectionId || undefined,
      q: q || undefined,
    });
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setMeId(result.data?.meId ?? null);
    setConnections((result.data?.connections as Connection[]) ?? []);
    setConversations((result.data?.conversations as Conversation[]) ?? []);
  }, [connectionId, q]);

  const loadThread = useCallback(async (id: string) => {
    const result = await listMensagens({ conversationId: id });
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setActive((result.data?.conversation as ActiveChat | undefined) ?? null);
    setMessages((result.data?.messages as Message[]) ?? []);
  }, []);

  useEffect(() => {
    void loadList();
    const timer = setInterval(() => void loadList(), 3000);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    void listQuickReplies().then((result) => {
      setReplies(
        (result.data ?? []).map((item) => ({
          shortcut: item.shortcut,
          body: item.body,
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadThread(activeId);
    const timer = setInterval(() => void loadThread(activeId), 3000);
    return () => clearInterval(timer);
  }, [activeId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const visible = useMemo(() => {
    return conversations.filter((item) => {
      if (tab === "group") return item.isGroup && item.status !== "closed";
      if (tab === "waiting") return !item.isGroup && item.status === "waiting";
      return (
        !item.isGroup &&
        item.status === "open" &&
        (!item.assignedUserId || item.assignedUserId === meId)
      );
    });
  }, [conversations, meId, tab]);

  const counts = useMemo(() => {
    return {
      open: conversations.filter(
        (item) =>
          !item.isGroup &&
          item.status === "open" &&
          (!item.assignedUserId || item.assignedUserId === meId)
      ).length,
      waiting: conversations.filter(
        (item) => !item.isGroup && item.status === "waiting"
      ).length,
      group: conversations.filter((item) => item.isGroup && item.status !== "closed")
        .length,
    };
  }, [conversations, meId]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || !body.trim()) return;
    setSending(true);
    const result = await sendMensagem({ conversationId: activeId, body });
    setSending(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setBody("");
    await Promise.all([loadThread(activeId), loadList()]);
  }

  function applyShortcut(value: string) {
    if (!value.startsWith("/")) {
      setBody(value);
      return;
    }
    const key = value.slice(1).split(/\s/)[0];
    const reply = replies.find((item) => item.shortcut === key);
    if (reply) {
      setBody(
        reply.body.replaceAll("{{nome}}", active?.contactName ?? "")
      );
    } else {
      setBody(value);
    }
  }

  return (
    <div className="grid h-[calc(100svh-3.5rem)] min-h-[520px] overflow-hidden border-t bg-background lg:h-[calc(100svh-4rem)] lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
      <section className="flex min-h-0 flex-col border-r">
        <div className="flex items-center gap-2 border-b p-2">
          {connections.length > 1 ? (
            <NativeSelect
              className="h-8"
              value={connectionId}
              onChange={(event) => setConnectionId(event.target.value)}
            >
              <option value="">Todas</option>
              {connections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <Input
            className="h-8"
            placeholder="Buscar"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => setNewOpen(true)}
          >
            <UserPlus />
          </Button>
        </div>
        <div className="grid grid-cols-3 border-b text-sm">
          {([
            ["open", "Aberto"],
            ["waiting", "Aguardando"],
            ["group", "Grupos"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "px-2 py-2",
                tab === id
                  ? "border-b-2 border-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {label}
              {counts[id] ? (
                <span className="ml-1 text-xs text-primary">{counts[id]}</span>
              ) : null}
            </button>
          ))}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma conversa nesta aba.
            </p>
          ) : (
            visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveId(item.id);
                  router.replace(`/atendimento?c=${item.id}`);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left",
                  activeId === item.id ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{item.contactName}</p>
                  {item.unreadCount > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      {item.unreadCount}
                    </span>
                  ) : null}
                </div>
                {!item.isGroup ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {formatPhone(item.contactPhone || item.contactJid)}
                  </p>
                ) : null}
                <p className="truncate text-xs text-muted-foreground">
                  {item.lastMessagePreview || "Sem mensagens"}
                </p>
              </button>
            ))
          )}
        </ScrollArea>
      </section>

      <section className="flex min-h-0 flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="font-medium">{active.contactName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPhone(active.contactPhone)} · {active.connectionName}
                </p>
              </div>
              <div className="flex gap-1">
                {active.status !== "open" ? (
                  <Button
                    variant="outline"
                    className="h-8 px-2"
                    onClick={async () => {
                      const result = await setConversaStatus({
                        conversationId: active.id,
                        status: "open",
                      });
                      if (result.serverError) {
                        toast.error(result.serverError);
                        return;
                      }
                      setTab("open");
                      await Promise.all([loadList(), loadThread(active.id)]);
                    }}
                  >
                    <CheckCheck />
                    Assumir
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-8 px-2"
                    onClick={async () => {
                      await setConversaStatus({
                        conversationId: active.id,
                        status: "waiting",
                      });
                      setTab("waiting");
                      await Promise.all([loadList(), loadThread(active.id)]);
                    }}
                  >
                    <RotateCcw />
                    Devolver
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="h-8 px-2"
                  onClick={async () => {
                    await setConversaStatus({
                      conversationId: active.id,
                      status: "closed",
                    });
                    setActiveId(null);
                    setActive(null);
                    await loadList();
                  }}
                >
                  <XCircle />
                  Encerrar
                </Button>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1 px-4 py-3">
              <div className="grid gap-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      message.direction === "out"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.body || message.type}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <form onSubmit={handleSend} className="border-t p-3">
              <div className="flex items-end gap-2">
                <label className="grid size-9 place-items-center rounded-lg border text-muted-foreground">
                  <Paperclip className="size-4" />
                  <input
                    type="file"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file || !activeId) return;
                      const buffer = await file.arrayBuffer();
                      const base64 = btoa(
                        String.fromCharCode(...new Uint8Array(buffer))
                      );
                      const mediatype = file.type.startsWith("image")
                        ? "image"
                        : file.type.startsWith("video")
                          ? "video"
                          : file.type.startsWith("audio")
                            ? "audio"
                            : "document";
                      setSending(true);
                      const result = await sendMensagem({
                        conversationId: activeId,
                        body: body || undefined,
                        media: {
                          mediatype,
                          mimetype: file.type,
                          media: base64,
                          fileName: file.name,
                        },
                      });
                      setSending(false);
                      event.target.value = "";
                      if (result.serverError) {
                        toast.error(result.serverError);
                        return;
                      }
                      setBody("");
                      await Promise.all([loadThread(activeId), loadList()]);
                    }}
                  />
                </label>
                <Textarea
                  className="min-h-11"
                  placeholder="Mensagem ou /atalho"
                  value={body}
                  onChange={(event) => applyShortcut(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend(event);
                    }
                  }}
                />
                <Button type="submit" disabled={sending} className="h-11 px-3">
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Selecione uma conversa ou pareie uma conexão.
          </div>
        )}
      </section>

      <aside className="hidden border-l lg:block">
        {active ? (
          <div className="grid gap-4 p-4">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Contato
              </p>
              <p className="mt-1 font-medium">{active.contactName}</p>
              <p className="text-sm text-muted-foreground">
                {formatPhone(active.contactPhone)}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Conexão
              </p>
              <p className="mt-1 text-sm">{active.connectionName}</p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Status
              </p>
              <p className="mt-1 text-sm capitalize">{active.status}</p>
            </div>
            {active.contactNotes ? (
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Notas
                </p>
                <p className="mt-1 text-sm">{active.contactNotes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir atendimento</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const conn = connectionId || connections[0]?.id;
              if (!conn) {
                toast.error("Crie uma conexão primeiro.");
                return;
              }
              const result = await startConversa({
                connectionId: conn,
                phone: newPhone,
                name: newName || undefined,
              });
              if (result.serverError || !result.data) {
                toast.error(result.serverError || "Não foi possível abrir.");
                return;
              }
              setNewOpen(false);
              setNewPhone("");
              setNewName("");
              setTab("waiting");
              setActiveId(result.data.id);
              await loadList();
            }}
          >
            <Field>
              <FieldLabel>Telefone</FieldLabel>
              <Input
                className="h-9"
                value={newPhone}
                onChange={(event) => setNewPhone(event.target.value)}
                placeholder="11999999999"
                required
              />
            </Field>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input
                className="h-9"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="submit" className="h-9 px-4">
                Abrir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
