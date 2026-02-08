import { db } from "./index";

const META_KEY_BLOCKLIST = "blocklist.hostnames";

/**
 * Normalize user input into a clean hostname or wildcard pattern.
 * Handles full URLs (https://example.com/path), hostnames with www prefix,
 * and wildcard patterns (*.example.com).
 */
export function normalizeBlockInput(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) return "";

  // Preserve wildcard prefix, normalize the rest
  if (value.startsWith("*.")) {
    const rest = normalizeBlockInput(value.slice(2));
    return rest ? `*.${rest}` : "";
  }

  // If it looks like a URL (has protocol or starts with //), extract hostname
  if (value.includes("://") || value.startsWith("//")) {
    try {
      // Ensure it has a protocol for URL parsing
      const urlStr = value.startsWith("//") ? `https:${value}` : value;
      const { hostname } = new URL(urlStr);
      value = hostname;
    } catch {
      // Not a valid URL, continue with raw value
    }
  }

  // Strip trailing slashes and paths (e.g. "example.com/path" → "example.com")
  const slashIndex = value.indexOf("/");
  if (slashIndex !== -1) {
    value = value.slice(0, slashIndex);
  }

  // Strip www. prefix for consistency
  value = value.replace(/^www\./, "");

  return value;
}

/**
 * Get the current blocklist of hostnames.
 * Returns an array of hostname patterns (exact or wildcard like "*.example.com").
 */
export async function getBlocklist(): Promise<string[]> {
  const record = await db.meta.get(META_KEY_BLOCKLIST);
  if (Array.isArray(record?.value)) {
    return record.value as string[];
  }
  return [];
}

/**
 * Replace the entire blocklist with a new list.
 */
export async function setBlocklist(hostnames: string[]): Promise<void> {
  const cleaned = hostnames
    .map((h) => normalizeBlockInput(h))
    .filter((h) => h.length > 0);
  // Deduplicate
  const unique = [...new Set(cleaned)];
  await db.meta.put({ key: META_KEY_BLOCKLIST, value: unique });
}

/**
 * Add a hostname to the blocklist.
 * Accepts full URLs, hostnames, or wildcard patterns — all are normalized automatically.
 * @returns true if the hostname was added, false if it was already present.
 */
export async function addToBlocklist(input: string): Promise<boolean> {
  const normalized = normalizeBlockInput(input);
  if (!normalized) return false;

  const current = await getBlocklist();
  if (current.includes(normalized)) return false;

  current.push(normalized);
  await db.meta.put({ key: META_KEY_BLOCKLIST, value: current });
  return true;
}

/**
 * Remove a hostname from the blocklist.
 * @returns true if the hostname was removed, false if it was not found.
 */
export async function removeFromBlocklist(hostname: string): Promise<boolean> {
  const normalized = hostname.trim().toLowerCase();
  const current = await getBlocklist();
  const index = current.indexOf(normalized);
  if (index === -1) return false;

  current.splice(index, 1);
  await db.meta.put({ key: META_KEY_BLOCKLIST, value: current });
  return true;
}

/**
 * Check if a hostname is blocked by the blocklist.
 * Supports exact match and wildcard prefix patterns (e.g. "*.example.com").
 */
export function isHostnameBlocked(hostname: string, blocklist: string[]): boolean {
  const h = hostname.toLowerCase();
  for (const pattern of blocklist) {
    if (pattern.startsWith("*.")) {
      // Wildcard: *.example.com matches example.com and sub.example.com
      const suffix = pattern.slice(2);
      if (h === suffix || h.endsWith("." + suffix)) {
        return true;
      }
    } else if (h === pattern) {
      return true;
    }
  }
  return false;
}

