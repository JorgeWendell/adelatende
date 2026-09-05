"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  listUsuarios,
  saveModuleAccess,
  saveUsuario,
  updateUsuarioRole,
} from "@/actions/cadastros";
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
import { PasswordInput } from "@/components/ui/password-input";
import { moduleProfiles, type ModuleProfile } from "@/config/modules";

const companyRoles = [
  { value: "owner", label: "Administrador da empresa" },
  { value: "admin", label: "Gestor da empresa" },
  { value: "member", label: "Membro" },
] as const;

type Grant = { slug: string; title: string; profile: ModuleProfile };

type UserRow = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  modules: Grant[];
};

function grouped(modules: Grant[]) {
  return moduleProfiles
    .map((item) => ({
      ...item,
      titles: modules
        .filter((row) => row.profile === item.value)
        .map((row) => row.title),
    }))
    .filter((item) => item.titles.length);
}

export function UsuariosCadastro() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [initialProfile, setInitialProfile] = useState<ModuleProfile>("usuario");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editModules, setEditModules] = useState<Grant[]>([]);
  const [editRole, setEditRole] = useState<UserRow["role"]>("member");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listUsuarios();
    setLoading(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    setCanManage(result.data?.canManage ?? false);
    setRows((result.data?.users as UserRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await saveUsuario({
      name,
      email,
      password,
      role: "member",
      initialProfile,
    });
    setSaving(false);
    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }
    toast.success("Usuário criado. Ajuste os módulos se precisar.");
    setOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    setInitialProfile("usuario");
    await load();
  }

  async function handleSaveModules(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    if (editRole !== editing.role) {
      const roleResult = await updateUsuarioRole({
        memberId: editing.memberId,
        role: editRole as "owner" | "admin" | "member",
      });
      if (roleResult.serverError) {
        setSaving(false);
        toast.error(roleResult.serverError);
        return;
      }
    }
    if (editRole !== "owner") {
      const result = await saveModuleAccess({
        memberId: editing.memberId,
        modules: editModules.map((item) => ({
          slug: item.slug,
          profile: item.profile,
        })),
      });
      if (result.serverError) {
        setSaving(false);
        toast.error(result.serverError);
        return;
      }
    }
    setSaving(false);
    toast.success("Permissões salvas.");
    setEditing(null);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Defina administrador, gestor, usuário ou negado em cada módulo.
          </p>
        </div>
        {canManage ? (
          <Button className="h-9 px-3" onClick={() => setOpen(true)}>
            <Plus />
            Novo
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3">
        {loading ? (
          <p className="rounded-xl border px-3 py-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.memberId} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-sm text-muted-foreground">{row.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.role === "owner" || row.role === "admin" ? (
                    <Badge variant="secondary">
                      {row.role === "owner"
                        ? "Admin da empresa"
                        : "Gestor da empresa"}
                    </Badge>
                  ) : null}
                  {canManage && row.role !== "owner" ? (
                    <Button
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditing(row);
                        setEditModules(row.modules);
                        setEditRole(row.role);
                      }}
                    >
                      <Pencil />
                      Módulos
                    </Button>
                  ) : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-1 text-sm">
                {grouped(row.modules).map((item) => (
                  <div
                    key={item.value}
                    className="flex flex-wrap gap-x-3 gap-y-0.5 sm:grid sm:grid-cols-[9rem_1fr]"
                  >
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd>{item.titles.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O perfil inicial vale para todos os módulos. Depois você ajusta
              um a um.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="user-name">Nome</FieldLabel>
                <Input
                  id="user-name"
                  className="h-9"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="user-email">E-mail</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  className="h-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="user-password">Senha</FieldLabel>
                <PasswordInput
                  id="user-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="user-profile">
                  Perfil inicial nos módulos
                </FieldLabel>
                <NativeSelect
                  id="user-profile"
                  className="h-9"
                  value={initialProfile}
                  onChange={(event) =>
                    setInitialProfile(event.target.value as ModuleProfile)
                  }
                >
                  {moduleProfiles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="h-9 px-4">
                {saving ? <Loader2 className="animate-spin" /> : null}
                Criar acesso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(next) => !next && setEditing(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Módulos — {editing?.name}</DialogTitle>
            <DialogDescription>
              Administrador, gestor, usuário ou negado em cada área.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveModules} className="grid gap-4">
            <Field>
              <FieldLabel>Papel na empresa</FieldLabel>
              <NativeSelect
                className="h-9"
                value={editRole}
                onChange={(event) => setEditRole(event.target.value)}
              >
                {companyRoles.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto pr-1">
              {editModules.map((item) => (
                <div
                  key={item.slug}
                  className="grid grid-cols-[1fr_10rem] items-center gap-2"
                >
                  <p className="text-sm">{item.title}</p>
                  <NativeSelect
                    className="h-8"
                    value={item.profile}
                    onChange={(event) =>
                      setEditModules((current) =>
                        current.map((row) =>
                          row.slug === item.slug
                            ? {
                                ...row,
                                profile: event.target.value as ModuleProfile,
                              }
                            : row
                        )
                      )
                    }
                  >
                    {moduleProfiles.map((profile) => (
                      <option key={profile.value} value={profile.value}>
                        {profile.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="h-9 px-4">
                {saving ? <Loader2 className="animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
