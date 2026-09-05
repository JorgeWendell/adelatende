"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);

    await authClient.signUp.email(
      {
        name,
        email,
        password,
      },
      {
        onSuccess() {
          setPending(false);
          router.push("/onboarding");
          router.refresh();
        },
        onError(ctx) {
          setPending(false);
          const message =
            ctx.error.message === "User already exists"
              ? "Já existe uma conta com este e-mail."
              : ctx.error.message ||
                "Não foi possível criar a conta. Tente novamente.";
          setError(message);
          toast.error(message);
        },
      }
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
        <div className="lg:hidden">
          <BrandLogo className="h-24 w-80" priority />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
            AdelAtende
          </p>
          <h1 className="font-heading text-3xl tracking-tight">Criar conta</h1>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="name">Nome</FieldLabel>
              <Input
                id="name"
                autoComplete="name"
                className="h-11"
                placeholder="Maria Silva"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">E-mail corporativo</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-11"
                placeholder="joao@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirmar senha</FieldLabel>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </Field>
          </FieldGroup>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" disabled={pending} className="h-11 w-full text-sm">
            {pending ? <Loader2 className="animate-spin" /> : null}
            Criar acesso
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
    </div>
  );
}
