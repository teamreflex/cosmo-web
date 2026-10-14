/**
 * Bidi controls, which can make a message display differently from what was
 * sent, and control characters other than tab and newline.
 */
const UNSAFE = /(?![\t\n])[\p{Bidi_Control}\p{Cc}]/gu;

export function sanitizeMessage(text: string) {
  return text.replace(UNSAFE, "").trim();
}
