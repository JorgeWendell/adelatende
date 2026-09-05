type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
};

function config(): EvolutionConfig {
  const baseUrl = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY ?? "";
  if (!baseUrl || !apiKey || apiKey === "change-me") {
    throw new Error(
      "Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no .env para conectar o WhatsApp."
    );
  }
  return { baseUrl, apiKey };
}

async function evoFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { baseUrl, apiKey } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { message?: string; error?: string }) : ({} as T);

  if (!response.ok) {
    const message =
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error ||
      `Evolution API ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function instanceNameFor(organizationId: string, connectionId: string) {
  return `atende_${organizationId.slice(0, 8)}_${connectionId.slice(0, 8)}`;
}

export async function createEvolutionInstance(instanceName: string) {
  return evoFetch<Record<string, unknown>>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

export async function connectEvolutionInstance(instanceName: string) {
  return evoFetch<Record<string, unknown>>(
    `/instance/connect/${encodeURIComponent(instanceName)}`
  );
}

export async function evolutionConnectionState(instanceName: string) {
  return evoFetch<{ instance?: { state?: string }; state?: string }>(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`
  );
}

export async function logoutEvolutionInstance(instanceName: string) {
  return evoFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
}

export async function deleteEvolutionInstance(instanceName: string) {
  return evoFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
}

export async function setEvolutionWebhook(instanceName: string, url: string) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  const payload = {
    webhook: {
      enabled: true,
      url,
      webhookByEvents: false,
      webhookBase64: true,
      events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
      ...(secret ? { headers: { "x-webhook-secret": secret } } : {}),
    },
  };

  try {
    return await evoFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return evoFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify({
        url,
        webhook_by_events: false,
        webhook_base64: true,
        events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
      }),
    });
  }
}

export async function sendEvolutionText(
  instanceName: string,
  number: string,
  text: string
) {
  return evoFetch<Record<string, unknown>>(
    `/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({ number, text }),
    }
  );
}

export async function sendEvolutionMedia(
  instanceName: string,
  number: string,
  media: { mediatype: string; mimetype: string; caption?: string; media: string; fileName?: string }
) {
  return evoFetch<Record<string, unknown>>(
    `/message/sendMedia/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({ number, ...media }),
    }
  );
}

export function extractQrBase64(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const qrcode = data.qrcode as Record<string, unknown> | undefined;
  const nested = data.data as Record<string, unknown> | undefined;
  const candidates = [
    data.base64,
    qrcode?.base64,
    nested?.base64,
    (nested?.qrcode as Record<string, unknown> | undefined)?.base64,
  ];
  for (const item of candidates) {
    if (typeof item === "string" && item.length > 20) {
      return item.startsWith("data:") ? item : `data:image/png;base64,${item}`;
    }
  }
  return null;
}

export function extractConnectionState(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "close";
  const data = payload as Record<string, unknown>;
  const instance = data.instance as Record<string, unknown> | undefined;
  const nested = data.data as Record<string, unknown> | undefined;
  const state =
    (typeof data.state === "string" && data.state) ||
    (typeof instance?.state === "string" && instance.state) ||
    (typeof nested?.state === "string" && nested.state) ||
    (typeof nested?.status === "string" && nested.status) ||
    "close";
  if (state === "open") return "open";
  if (state === "connecting") return "connecting";
  return "close";
}

export function webhookUrl() {
  const explicit = process.env.EVOLUTION_WEBHOOK_URL?.replace(/\/$/, "");
  if (explicit?.endsWith("/api/webhooks/evolution")) {
    return explicit;
  }
  if (explicit) {
    return `${explicit}/api/webhooks/evolution`;
  }

  const base = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BETTER_AUTH_URL ||
    ""
  ).replace(/\/$/, "");
  return base ? `${base}/api/webhooks/evolution` : "";
}

export function webhookBaseUrl() {
  return webhookUrl().replace(/\/api\/webhooks\/evolution$/, "");
}
