/**
 * Where the editor's page and picker sit side by side, matching Tailwind's
 * `lg`. Below it the picker is a sheet.
 */
export const SIDE_BY_SIDE = "(width >= 64rem)";

/**
 * Checked in effects and handlers only, so the server and the first client
 * render stay the same for every screen.
 */
export function isSideBySide() {
  return window.matchMedia(SIDE_BY_SIDE).matches;
}

// the pin grid's thresholds, so a click never turns into a drag
export const DRAG_DISTANCE = 8;
// and a touch drag starts on a hold, so a swipe still scrolls
export const TOUCH_DRAG_DELAY = 200;
export const TOUCH_DRAG_TOLERANCE = 8;
