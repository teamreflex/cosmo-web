/**
 * Bidi controls, which can make a message display differently from what was
 * sent, and control characters other than tab and newline.
 */
const UNSAFE = /(?![\t\n])[\p{Bidi_Control}\p{Cc}]/gu;

/**
 * A character that shows: neither whitespace, an invisible format character
 * such as a zero-width space, a Hangul filler nor the blank Braille pattern.
 */
const VISIBLE = /[^\p{Cf}\sᅟᅠ⠀ㅤﾠ]/u;

/**
 * Text with its unsafe characters removed and trimmed, or "" when nothing
 * visible remains. Format characters inside visible text stay, since emoji
 * sequences and some scripts need them.
 */
export function sanitizeMessage(text: string) {
  const sanitized = text.replace(UNSAFE, "").trim();
  return VISIBLE.test(sanitized) ? sanitized : "";
}
