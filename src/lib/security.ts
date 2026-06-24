export const DEFAULT_PRODUCT_IMAGE_URL = "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=900&q=80";

const controlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanPlainText(value: string, maxLength = 1000) {
  return value.replace(controlChars, "").trim().slice(0, maxLength);
}

export function sanitizeExternalImageUrl(value: string, fallback = DEFAULT_PRODUCT_IMAGE_URL) {
  const cleaned = cleanPlainText(value, 2048);
  if (!cleaned) return fallback;

  try {
    const url = new URL(cleaned);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return fallback;
  }

  return fallback;
}
