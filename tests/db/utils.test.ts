import { describe, test, expect } from 'vitest'
import { normalizeUrl } from '@/db/utils'

describe('normalizeUrl', () => {
  describe('Standard HTTP/HTTPS URLs', () => {
    test('should normalize a basic HTTPS URL', () => {
      const result = normalizeUrl('https://google.com/search')
      expect(result.domain).toBe('google.com')
      expect(result.subdomain).toBe('google.com')
      expect(result.protocol).toBe('https:')
      expect(result.isWebPage).toBe(true)
      expect(result.path).toBe('/search')
    })

    test('should handle HTTP protocol', () => {
      const result = normalizeUrl('http://example.com/page')
      expect(result.protocol).toBe('http:')
      expect(result.isWebPage).toBe(true)
    })

    test('should preserve subdomain', () => {
      const result = normalizeUrl('https://mail.google.com/inbox')
      expect(result.subdomain).toBe('mail.google.com')
      expect(result.domain).toBe('google.com')
    })

    test('should remove trailing slash from path', () => {
      const result = normalizeUrl('https://google.com/search/')
      expect(result.path).toBe('/search')
    })

    test('should keep root path as /', () => {
      const result = normalizeUrl('https://google.com/')
      expect(result.path).toBe('/')
    })

    test('should have / path for root URL without trailing slash', () => {
      const result = normalizeUrl('https://google.com')
      expect(result.path).toBe('/')
    })
  })

  describe('Query parameters cleaning', () => {
    test('should remove UTM parameters', () => {
      const result = normalizeUrl('https://example.com?utm_source=google&utm_medium=cpc')
      expect(result.path).not.toContain('utm_source')
      expect(result.path).not.toContain('utm_medium')
    })

    test('should preserve functional parameters', () => {
      const result = normalizeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result.path).toContain('v=dQw4w9WgXcQ')
    })

    test('should remove fbclid and gclid', () => {
      const result = normalizeUrl('https://example.com?fbclid=123&gclid=456')
      expect(result.path).not.toContain('fbclid')
      expect(result.path).not.toContain('gclid')
    })

    test('should handle mixed tracking and functional parameters', () => {
      const result = normalizeUrl('https://youtube.com/watch?v=abc&utm_source=fb&utm_medium=cpc')
      expect(result.path).toContain('v=abc')
      expect(result.path).not.toContain('utm_source')
      expect(result.path).not.toContain('utm_medium')
    })

    test('should keep root path when only tracking params exist', () => {
      const result = normalizeUrl('https://example.com?utm_source=google')
      expect(result.path).toBe('/')
    })
  })

  describe('Special protocols', () => {
    test('should handle file:// protocol', () => {
      const result = normalizeUrl('file:///Users/test/document.txt')
      expect(result.domain).toBe('Local File')
      expect(result.subdomain).toBe('Local File')
      expect(result.protocol).toBe('file:')
      expect(result.isWebPage).toBe(false)
    })

    test('should handle chrome-extension:// protocol', () => {
      const result = normalizeUrl('chrome-extension://abcdef123456/popup.html')
      expect(result.domain).toBe('Extension')
      expect(result.subdomain).toBe('Extension')
      expect(result.protocol).toBe('chrome-extension:')
      expect(result.isWebPage).toBe(false)
    })

    test('should handle about: protocol', () => {
      const result = normalizeUrl('about:blank')
      expect(result.domain).toBe('Browser')
      expect(result.subdomain).toBe('Browser')
      expect(result.protocol).toBe('about:')
      expect(result.isWebPage).toBe(false)
    })
  })

  describe('Invalid URLs', () => {
    test('should handle invalid URL string', () => {
      const result = normalizeUrl('not a valid url')
      expect(result.domain).toBe('Invalid')
      expect(result.subdomain).toBe('Invalid')
      expect(result.protocol).toBe('unknown:')
      expect(result.isWebPage).toBe(false)
    })

    test('should handle empty string', () => {
      const result = normalizeUrl('')
      expect(result.domain).toBe('Invalid')
      expect(result.isWebPage).toBe(false)
    })

    test('should handle malformed URL', () => {
      const result = normalizeUrl('ht!tp://[invalid]')
      expect(result.domain).toBe('Invalid')
      expect(result.isWebPage).toBe(false)
    })
  })

  describe('URL structure', () => {
    test('should build correct fullPath for HTTPS URL', () => {
      const result = normalizeUrl('https://example.com/path?param=value')
      expect(result.fullPath).toBe('https://example.com/path?param=value')
    })

    test('should build correct fullPath with cleaned parameters', () => {
      const result = normalizeUrl('https://example.com/path?v=123&utm_source=google')
      expect(result.fullPath).toBe('https://example.com/path?v=123')
    })

    test('should preserve protocol case sensitivity', () => {
      const result = normalizeUrl('HTTPS://GOOGLE.COM/SEARCH')
      expect(result.protocol).toBe('https:')
      expect(result.subdomain).toBe('google.com')
    })
  })

  describe('Complex real-world URLs', () => {
    test('should handle LinkedIn profile URL', () => {
      const result = normalizeUrl('https://www.linkedin.com/in/john-doe/?utm_source=twitter')
      expect(result.domain).toBe('linkedin.com')
      expect(result.subdomain).toBe('www.linkedin.com')
      expect(result.path).toBe('/in/john-doe')
    })

    test('should handle GitHub repository URL', () => {
      const result = normalizeUrl('https://github.com/user/repo?ref=main')
      expect(result.domain).toBe('github.com')
      expect(result.path).toBe('/user/repo')
    })

    test('should handle Amazon product URL with tracking', () => {
      const result = normalizeUrl('https://www.amazon.com/product?asin=12345&ref=something_else&gclid=xyz')
      expect(result.domain).toBe('amazon.com')
      expect(result.path).toContain('asin=12345')
      expect(result.path).not.toContain('gclid')
    })
  })
})
