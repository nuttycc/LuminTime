import { db } from "./index";

const META_KEY_BLOCKLIST = "blocklist.hostnames";

function sanitizeHostnameList(hostnames: string[]): string[] {
  const normalizedHostnames = hostnames
    .map((hostname) => normalizeBlockInput(hostname))
    .filter((hostname) => hostname.length > 0);

  return [...new Set(normalizedHostnames)];
}

export function normalizeBlockInput(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) {
    return "";
  }

  if (value.startsWith("*.")) {
    value = value.slice(2);
  }

  if (value.includes("://") || value.startsWith("//")) {
    try {
      const urlStr = value.startsWith("//") ? `https:${value}` : value;
      value = new URL(urlStr).hostname;
    } catch {
      // Keep raw value when URL parsing fails.
    }
  }

  const slashIndex = value.indexOf("/");
  if (slashIndex !== -1) {
    value = value.slice(0, slashIndex);
  }

  return value.replace(/^www\./, "");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function getBlocklist(): Promise<string[]> {
  const record = await db.meta.get(META_KEY_BLOCKLIST);
  return isStringArray(record?.value) ? record.value : [];
}

export async function setBlocklist(hostnames: string[]): Promise<void> {
  const sanitizedHostnames = sanitizeHostnameList(hostnames);
  await db.meta.put({ key: META_KEY_BLOCKLIST, value: sanitizedHostnames });
}

export async function addToBlocklist(input: string): Promise<boolean> {
  const normalized = normalizeBlockInput(input);
  if (!normalized) {
    return false;
  }

  return db.transaction("rw", db.meta, async () => {
    const record = await db.meta.get(META_KEY_BLOCKLIST);
    const current = isStringArray(record?.value) ? [...record.value] : [];

    if (current.includes(normalized)) {
      return false;
    }

    current.push(normalized);
    await db.meta.put({ key: META_KEY_BLOCKLIST, value: current });
    return true;
  });
}

export async function removeFromBlocklist(hostname: string): Promise<boolean> {
  const normalized = normalizeBlockInput(hostname);
  if (!normalized) {
    return false;
  }

  return db.transaction("rw", db.meta, async () => {
    const record = await db.meta.get(META_KEY_BLOCKLIST);
    const current = isStringArray(record?.value) ? [...record.value] : [];
    const index = current.indexOf(normalized);

    if (index === -1) {
      return false;
    }

    current.splice(index, 1);
    await db.meta.put({ key: META_KEY_BLOCKLIST, value: current });
    return true;
  });
}

export function isHostnameBlocked(hostname: string, blocklist: string[]): boolean {
  const normalized = normalizeBlockInput(hostname);
  return blocklist.includes(normalized);
}

export function notifyBlocklistUpdate(): void {
  browser.runtime.sendMessage("blocklist-updated").catch(() => {});
}
