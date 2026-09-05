"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getEmpresa, saveEmpresa } from "@/actions/cadastros";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type EmpresaFormState = {
  name: string;
  tradeName: string;
  document: string;
  phone: string;
  email: string;
  zip: string;
  address: string;
  addressNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

const empty: EmpresaFormState = {
  name: "",
  tradeName: "",
  document: "",
  phone: "",
  email: "",
  zip: "",
  address: "",
  addressNumber: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export function EmpresaForm() {
  const [form, setForm] = useState<EmpresaFormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getEmpresa().then((result) => {
      setLoading(false);
      if (result.serverError || !result.data) {
        toast.error(result.serverError || "Não foi possível carregar a empresa.");
        return;
      }
      const company = result.data;
      setForm({
        name: company.name ?? "",
        tradeName: company.tradeName ?? "",
        document: company.document ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        zip: company.zip ?? "",
        address: company.address ?? "",
        addressNumber: company.addressNumber ?? "",
        complement: company.complement ?? "",
        district: company.district ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
      });
    });
  }, []);

  function setField<K extends keyof EmpresaFormState>(
    key: K,
    value: EmpresaFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await saveEmpresa({
      name: form.name,
      tradeName: form.tradeName || undefined,
      document: form.document || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      zip: form.zip || undefined,
      address: form.address || undefined,
      addressNumber: form.addressNumber || undefined,
      complement: form.complement || undefined,
      district: form.district || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
    });
    setSaving(false);

    if (result.serverError) {
      toast.error(result.serverError);
      return;
    }

    toast.success("Empresa atualizada.");
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border px-3 py-8 text-center text-sm text-muted-foreground">
        Carregando empresa...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Empresa</h1>
          <p className="text-sm text-muted-foreground">
            Dados da empresa logada no AdelAtende.
          </p>
        </div>
        <Button type="submit" disabled={saving} className="h-9 px-3">
          {saving ? <Loader2 className="animate-spin" /> : null}
          Salvar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/50 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Identificação
        </div>
        <div className="p-4">
          <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="name">Razão social</FieldLabel>
              <Input
                id="name"
                className="h-9"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tradeName">Nome fantasia</FieldLabel>
              <Input
                id="tradeName"
                className="h-9"
                value={form.tradeName}
                onChange={(event) => setField("tradeName", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="document">CNPJ</FieldLabel>
              <Input
                id="document"
                className="h-9"
                value={form.document}
                onChange={(event) => setField("document", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Telefone</FieldLabel>
              <Input
                id="phone"
                className="h-9"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </Field>
            <Field className="sm:col-span-2 lg:col-span-3">
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                type="email"
                className="h-9"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        <div className="border-y bg-muted/50 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Endereço
        </div>
        <div className="p-4">
          <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Field className="lg:col-span-2">
              <FieldLabel htmlFor="zip">CEP</FieldLabel>
              <Input
                id="zip"
                className="h-9"
                value={form.zip}
                onChange={(event) => setField("zip", event.target.value)}
              />
            </Field>
            <Field className="lg:col-span-3">
              <FieldLabel htmlFor="city">Cidade</FieldLabel>
              <Input
                id="city"
                className="h-9"
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">UF</FieldLabel>
              <Input
                id="state"
                className="h-9"
                maxLength={2}
                value={form.state}
                onChange={(event) =>
                  setField("state", event.target.value.toUpperCase())
                }
              />
            </Field>
            <Field className="sm:col-span-2 lg:col-span-4">
              <FieldLabel htmlFor="address">Logradouro</FieldLabel>
              <Input
                id="address"
                className="h-9"
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="addressNumber">Número</FieldLabel>
              <Input
                id="addressNumber"
                className="h-9"
                value={form.addressNumber}
                onChange={(event) =>
                  setField("addressNumber", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="complement">Complemento</FieldLabel>
              <Input
                id="complement"
                className="h-9"
                value={form.complement}
                onChange={(event) => setField("complement", event.target.value)}
              />
            </Field>
            <Field className="sm:col-span-2 lg:col-span-6">
              <FieldLabel htmlFor="district">Bairro</FieldLabel>
              <Input
                id="district"
                className="h-9"
                value={form.district}
                onChange={(event) => setField("district", event.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>
      </div>
    </form>
  );
}
