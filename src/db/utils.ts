export interface NormalizedUrl {
  hostname: string;
  path: string;
  protocol: string;
  fullPath: string;
  isWebPage: boolean;
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "_ga",
  "ref",
  "source",
]);

function cleanSearchParams(search: string): string {
  if (!search || search.length <= 1) return "";

  const searchParams = new URLSearchParams(search);
  const keysToDelete: string[] = [];

  searchParams.forEach((_, key) => {
    // 移除黑名单中的参数
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    searchParams.delete(key);
  });

  const cleanedString = searchParams.toString();
  return cleanedString ? `?${cleanedString}` : "";
}

function getSystemHostname(protocol: string): string {
  switch (protocol) {
    case "file:":
      return "Local File";
    case "chrome-extension:":
      return "Extension";
    case "about:":
      return "Browser";
    default:
      return "System";
  }
}

function normalizeHostname(hostname: string): string {
  if (hostname.startsWith("www.")) {
    return hostname.slice(4);
  }

  return hostname;
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function normalizeUrl(urlStr: string): NormalizedUrl {
  try {
    const url = new URL(urlStr);
    const protocol = url.protocol.toLowerCase();
    const isWebPage = protocol === "http:" || protocol === "https:";

    if (!isWebPage) {
      return {
        hostname: getSystemHostname(protocol),
        path: url.pathname,
        protocol,
        fullPath: urlStr,
        isWebPage: false,
      };
    }

    const normalizedHostname = normalizeHostname(url.hostname.toLowerCase());
    const normalizedPathname = normalizePath(url.pathname);
    const cleanSearch = cleanSearchParams(url.search);
    const path = `${normalizedPathname}${cleanSearch}`;
    const fullPath = `${protocol}//${url.hostname.toLowerCase()}${path}`;

    return {
      hostname: normalizedHostname,
      path,
      protocol,
      fullPath,
      isWebPage: true,
    };
  } catch {
    return {
      hostname: "Invalid",
      path: urlStr,
      protocol: "unknown:",
      fullPath: urlStr,
      isWebPage: false,
    };
  }
}

export function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
