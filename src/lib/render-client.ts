// Browser-side Render API key storage

const RENDER_API_KEY_STORAGE = "render-api-key";

export function getRenderApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(RENDER_API_KEY_STORAGE);
}

export function saveRenderApiKey(key: string): void {
  localStorage.setItem(RENDER_API_KEY_STORAGE, key);
}

export function clearRenderApiKey(): void {
  localStorage.removeItem(RENDER_API_KEY_STORAGE);
}
