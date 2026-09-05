"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createCompany } from "@/actions/company";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isPublicEmailDomain } from "@/lib/email-domain";

type CreateCompanyDialogProps = {
  open: boolean;
  email?: string;
  domain?: string | null;
};

export function CreateCompanyDialog({
  open,
  email,
  domain,
}: CreateCompanyDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const publicDomain = isPublicEmailDomain(domain ?? null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createCompany({
      name,
      tradeName: tradeName || undefined,
      document: document || undefined,
      phone: phone || undefined,
    });

    setPending(false);

    if (result.serverError) {
      setError(result.serverError);
      return;
    }

    if (result.validationErrors) {
      setError("Revise os dados da empresa.");
      return;
    }

    toast.success(
      result.data?.status === "joined"
        ? "Você entrou na empresa do seu domínio."
        : "Empresa criada com sucesso."
    );
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar empresa</DialogTitle>
          <DialogDescription>
            {publicDomain
              ? "Informe os dados da empresa para começar a usar o AdelAtende."
              : `Usuários com e-mail @${domain} entram automaticamente nesta empresa.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {email ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Conta: <span className="font-medium text-foreground">{email}</span>
            </p>
          ) : null}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="company-name">Razão social</FieldLabel>
              <Input
                id="company-name"
                className="h-10"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Adel Tech Ltda"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-trade">Nome fantasia</FieldLabel>
              <Input
                id="company-trade"
                className="h-10"
                value={tradeName}
                onChange={(event) => setTradeName(event.target.value)}
                placeholder="Adel Tech"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="company-document">CNPJ</FieldLabel>
                <Input
                  id="company-document"
                  className="h-10"
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="company-phone">Telefone</FieldLabel>
                <Input
                  id="company-phone"
                  className="h-10"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </Field>
            </div>
          </FieldGroup>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter className="sm:justify-between">
            <p className="self-center text-xs text-muted-foreground">
              Primeiro usuário vira administrador da empresa.
            </p>
            <Button type="submit" disabled={pending} className="h-10 px-4">
              {pending ? <Loader2 className="animate-spin" /> : null}
              Criar empresa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
