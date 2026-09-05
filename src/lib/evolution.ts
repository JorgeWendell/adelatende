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

function evolutionUnreachable(baseUrl: string, error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  return new Error(
    raw && raw !== "fetch failed"
      ? `Não foi possível falar com a Evolution API em ${baseUrl}: ${raw}`
      : `Não foi possível falar com a Evolution API em ${baseUrl}. Confira se o container está no ar e se EVOLUTION_API_URL está correto (em Docker: http://evolution:8080).`
  );
}

async function evoFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { baseUrl, apiKey } = config();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw evolutionUnreachable(baseUrl, error);
  }

  const text = await response.text();
  let data = {} as T & { message?: string; error?: string };
  if (text) {
    try {
      data = JSON.parse(text) as T & { message?: string; error?: string };
    } catch {
      throw new Error(
        response.ok
          ? "A Evolution API devolveu uma resposta inválida."
          : `Evolution API ${response.status}`
      );
    }
  }

  if (!response.ok) {
    const message =
      data.message || data.error || `Evolution API ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function instanceNameFor(organizationId: string, connectionId: string) {
  return `atende_${organizationId.slice(0, 8)}_${connectionId.slice(0, 8)}`;
}

function webhookPayload(url: string) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  return {
    enabled: true,
    url,
    byEvents: false,
    base64: true,
    events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
    ...(secret ? { headers: { "x-webhook-secret": secret } } : {}),
  };
}

export async function createEvolutionInstance(
  instanceName: string,
  webhook?: string
) {
  return evoFetch<Record<string, unknown>>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      ...(webhook ? { webhook: webhookPayload(webhook) } : {}),
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
  try {
    return await evoFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify({ webhook: webhookPayload(url) }),
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

export async function restartEvolutionInstance(instanceName: string) {
  try {
    return await evoFetch(`/instance/restart/${encodeURIComponent(instanceName)}`, {
      method: "PUT",
    });
  } catch {
    return evoFetch(`/instance/restart/${encodeURIComponent(instanceName)}`);
  }
}

export async function waitForQr(instanceName: string, seed?: unknown) {
  let qr = await qrImageFromPayload(seed);
  if (qr) return qr;

  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (attempt === 5) {
      await restartEvolutionInstance(instanceName).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const connected = await connectEvolutionInstance(instanceName);
    qr = await qrImageFromPayload(connected);
    if (qr) return qr;
    if (attempt === 9) {
      const keys =
        connected && typeof connected === "object"
          ? Object.keys(connected as object).join(", ")
          : String(connected);
      console.error(`[evolution] QR ausente em ${instanceName}. Chaves: ${keys}`);
    }
  }

  return null;
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

function asQrImage(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 40) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("data:image")) return trimmed;
  if (trimmed.startsWith("iVBORw0KGgo") || trimmed.startsWith("/9j/")) {
    return `data:image/png;base64,${trimmed}`;
  }
  return null;
}

function asQrPayloadCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("2@") && trimmed.length > 20) return trimmed;
  return null;
}

export function extractQrBase64(payload: unknown, depth = 0): string | null {
  if (payload == null || depth > 5) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractQrBase64(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const direct = asQrImage(payload);
  if (direct) return direct;
  if (typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  for (const key of ["base64", "qrcode", "qrCode", "qr", "data"]) {
    const found = extractQrBase64(data[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function extractQrPayloadCode(payload: unknown): string | null {
  const items = Array.isArray(payload) ? payload : [payload];
  for (const item of items) {
    if (!item || typeof item !== "object") {
      const direct = asQrPayloadCode(item);
      if (direct) return direct;
      continue;
    }
    const obj = item as Record<string, unknown>;
    const nested = (obj.qrcode ?? obj.qrCode ?? obj.data) as
      | Record<string, unknown>
      | string
      | undefined;
    const candidates = [
      obj.code,
      typeof nested === "string" ? nested : nested?.code,
      typeof obj.data === "object" && obj.data
        ? (obj.data as { qrcode?: { code?: string } }).qrcode?.code
        : null,
    ];
    for (const value of candidates) {
      const found = asQrPayloadCode(value);
      if (found) return found;
    }
  }
  return null;
}

export async function qrImageFromPayload(payload: unknown): Promise<string | null> {
  const image = extractQrBase64(payload);
  if (image) return image;

  const code = extractQrPayloadCode(payload);
  if (!code) return null;

  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(code, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "H",
  });
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
