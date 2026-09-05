export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatPhone(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value || "—";
}

export function jidFromPhone(phone: string) {
  const digits = digitsOnly(phone);
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `${withCountry}@s.whatsapp.net`;
}

export function phoneFromJid(jid: string) {
  return jid.replace(/@.*$/, "").replace(/:\d+$/, "");
}

export function isGroupJid(jid: string) {
  return jid.includes("@g.us");
}

export function displayNameFromJid(jid: string, name?: string | null) {
  if (name?.trim()) return name.trim();
  return formatPhone(phoneFromJid(jid));
}
