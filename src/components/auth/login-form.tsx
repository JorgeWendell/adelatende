"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      const message =
        signInError.message === "Invalid email or password"
          ? "E-mail ou senha inválidos."
          : signInError.message || "Não foi possível entrar.";
      setError(message);
      toast.error(message);
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
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
        <h1 className="font-heading text-3xl tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Acesse o inbox, as filas e as conexões WhatsApp da operação.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-11"
              placeholder="maria@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
        </FieldGroup>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={pending} className="h-11 w-full text-sm">
          {pending ? <Loader2 className="animate-spin" /> : null}
          Entrar
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Ainda não tem acesso?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
