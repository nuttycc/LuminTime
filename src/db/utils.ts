export interface NormalizedUrl {
  hostname: string; // e.g. "google.com" (without www)
  path: string; // e.g. "/watch?v=dQw4w9WgXcQ" (已清洗追踪参数)
  protocol: string; // e.g. "https:"
  fullPath: string; // 完整的清洗后的 URL
  isWebPage: boolean; // 是否为常规网页 (http/https)
}

// 需要移除的常见的追踪参数黑名单
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

/**
 * 清洗 URL 查询参数
 * 保留功能性参数 (如 youtube video id)，移除营销追踪参数
 */
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

export function normalizeUrl(urlStr: string): NormalizedUrl {
  try {
    const url = new URL(urlStr);
    const protocol = url.protocol.toLowerCase();
    const isWebPage = protocol === "http:" || protocol === "https:";

    // 1. 特殊协议处理 (非 HTTP/HTTPS)
    if (!isWebPage) {
      let systemHostname = "System";
      if (protocol === "file:") systemHostname = "Local File";
      if (protocol === "chrome-extension:") systemHostname = "Extension";
      if (protocol === "about:") systemHostname = "Browser";

      return {
        hostname: systemHostname,
        path: url.pathname, // 系统页通常不需要 query
        protocol: protocol,
        fullPath: urlStr,
        isWebPage: false,
      };
    }

    // 2. 主机名提取
    // 强制转小写，虽然 URL 对象通常会自动处理，但显式处理更安全
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    // 3. 路径清洗 (移除末尾斜杠)
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    // 4. 参数清洗 (移除 UTM 等)
    const cleanSearch = cleanSearchParams(url.search);

    // 组合最终的 Path
    const finalPath = pathname + cleanSearch;

    // 重新组合 FullPath (使用清洗后的部分)
    // 注意：这里不包含 hash (#)，因为通常 hash 用于锚点定位，不改变页面内容
    // 除非是在做 SPA (单页应用) 的特定路由分析
    const finalFullPath = `${protocol}//${url.hostname.toLowerCase()}${finalPath}`;

    return {
      hostname: hostname,
      path: finalPath,
      protocol: protocol,
      fullPath: finalFullPath,
      isWebPage: true,
    };
  } catch (e) {
    // 极少数解析失败的情况
    return {
      hostname: "Invalid",
      path: urlStr,
      protocol: "unknown:",
      fullPath: urlStr,
      isWebPage: false,
    };
  }
}

/**
 * 获取当前日期的字符串 (YYYY-MM-DD)
 */
export function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
