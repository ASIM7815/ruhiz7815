/**
 * URL regex pattern
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Detect URLs in text
 */
export function detectUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Check if text contains URLs
 */
export function hasUrls(text: string): boolean {
  return URL_REGEX.test(text);
}

/**
 * Replace URLs in text with clickable links
 */
export function linkifyText(text: string): string {
  return text.replace(
    URL_REGEX,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`
  );
}

/**
 * Extract first URL from text
 */
export function getFirstUrl(text: string): string | null {
  const urls = detectUrls(text);
  return urls.length > 0 ? urls[0] : null;
}
