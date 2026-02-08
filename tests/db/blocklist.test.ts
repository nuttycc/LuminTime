import { describe, test, expect } from "vitest";
import { normalizeBlockInput, isHostnameBlocked } from "@/db/blocklist";

describe("normalizeBlockInput", () => {
  describe("plain hostnames", () => {
    test("should pass through a plain hostname", () => {
      expect(normalizeBlockInput("example.com")).toBe("example.com");
    });

    test("should lowercase the input", () => {
      expect(normalizeBlockInput("Example.COM")).toBe("example.com");
    });

    test("should trim whitespace", () => {
      expect(normalizeBlockInput("  example.com  ")).toBe("example.com");
    });

    test("should strip www. prefix", () => {
      expect(normalizeBlockInput("www.example.com")).toBe("example.com");
    });

    test("should return empty string for empty input", () => {
      expect(normalizeBlockInput("")).toBe("");
      expect(normalizeBlockInput("   ")).toBe("");
    });
  });

  describe("full URLs → hostname extraction", () => {
    test("should extract hostname from https URL", () => {
      expect(normalizeBlockInput("https://haskellforall.com/")).toBe("haskellforall.com");
    });

    test("should extract hostname from https URL with path", () => {
      expect(normalizeBlockInput("https://haskellforall.com/2026/02/beyond-agentic-coding")).toBe("haskellforall.com");
    });

    test("should extract hostname from http URL", () => {
      expect(normalizeBlockInput("http://example.com/page?q=1")).toBe("example.com");
    });

    test("should strip www from URL hostname", () => {
      expect(normalizeBlockInput("https://www.facebook.com/profile")).toBe("facebook.com");
    });

    test("should handle protocol-relative URLs", () => {
      expect(normalizeBlockInput("//example.com/path")).toBe("example.com");
    });

    test("should handle URL with port", () => {
      expect(normalizeBlockInput("https://localhost:3000/app")).toBe("localhost");
    });
  });

  describe("hostname with trailing path (no protocol)", () => {
    test("should strip path from bare hostname", () => {
      expect(normalizeBlockInput("example.com/some/path")).toBe("example.com");
    });

    test("should strip trailing slash", () => {
      expect(normalizeBlockInput("example.com/")).toBe("example.com");
    });
  });

  describe("legacy wildcard migration", () => {
    test("should strip wildcard prefix to plain hostname", () => {
      expect(normalizeBlockInput("*.example.com")).toBe("example.com");
    });

    test("should normalize the hostname part after stripping wildcard", () => {
      expect(normalizeBlockInput("*.WWW.Example.COM")).toBe("example.com");
    });

    test("should handle wildcard with trailing path", () => {
      expect(normalizeBlockInput("*.example.com/path")).toBe("example.com");
    });
  });
});

describe("isHostnameBlocked", () => {
  describe("exact match", () => {
    test("should match exact hostname", () => {
      expect(isHostnameBlocked("example.com", ["example.com"])).toBe(true);
    });

    test("should not match different hostname", () => {
      expect(isHostnameBlocked("other.com", ["example.com"])).toBe(false);
    });

    test("should be case-insensitive", () => {
      expect(isHostnameBlocked("Example.COM", ["example.com"])).toBe(true);
    });

    test("should not match subdomain against exact rule", () => {
      expect(isHostnameBlocked("sub.example.com", ["example.com"])).toBe(false);
    });
  });

  describe("empty blocklist", () => {
    test("should return false for empty blocklist", () => {
      expect(isHostnameBlocked("example.com", [])).toBe(false);
    });
  });

  describe("multiple rules", () => {
    test("should match if any rule matches", () => {
      const blocklist = ["facebook.com", "google.com", "twitter.com"];
      expect(isHostnameBlocked("facebook.com", blocklist)).toBe(true);
      expect(isHostnameBlocked("google.com", blocklist)).toBe(true);
      expect(isHostnameBlocked("twitter.com", blocklist)).toBe(true);
      expect(isHostnameBlocked("github.com", blocklist)).toBe(false);
    });
  });
});
