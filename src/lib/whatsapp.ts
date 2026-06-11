export function normalizeArgentinaWhatsapp(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.startsWith("9")) return `54${digits}`;
  if (digits.startsWith("11")) return `549${digits}`;

  return `549${digits}`;
}

export function isValidArgentinaWhatsapp(input: string) {
  const normalized = normalizeArgentinaWhatsapp(input);
  return /^549\d{10}$/.test(normalized);
}

export function whatsappHint(input: string) {
  const normalized = normalizeArgentinaWhatsapp(input);
  if (!normalized) return "Ej: 11 1234 5678, 91112345678 o 5491112345678.";
  if (!isValidArgentinaWhatsapp(input)) return `Revisalo: quedaria ${normalized}, pero no parece tener 13 digitos.`;
  return `Se guardara como ${normalized}.`;
}
