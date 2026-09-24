/**
 * Timings for the binder viewer's cover: it flies from the clicked cover onto
 * the right-hand page, then swings open on its spine; closing reverses both.
 */
export const leafMotion = {
  flight: { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" },
  swingOpen: { duration: 760, easing: "cubic-bezier(.5,.05,.2,1)" },
  swingShut: { duration: 560, easing: "cubic-bezier(.5,.05,.2,1)" },
  flightBack: { duration: 380, easing: "cubic-bezier(.4,0,.2,1)" },
  appear: { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
  fade: { duration: 220 },
  scrim: { duration: 300 },
  pageTurn: { duration: 220, easing: "ease-out" },
} satisfies Record<string, KeyframeAnimationOptions>;

/**
 * Whether the system asks for reduced motion, checked as each animation
 * starts rather than when the viewer renders.
 */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
export const fadeOut: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];

/**
 * Played on the spread's rings alongside the cover's swing. They stand up from
 * the spine, so the cover passes over them while its front faces up, and they
 * rise from their own `z-2` to above the leaf's `z-20` once it's past upright.
 */
export function ringFrames(direction: "open" | "shut"): Keyframe[] {
  const [first, second] = direction === "open" ? [2, 21] : [21, 2];
  return [
    { zIndex: first, offset: 0 },
    { zIndex: first, offset: 0.5 },
    { zIndex: second, offset: 0.5 },
    { zIndex: second, offset: 1 },
  ];
}

const corners = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
] as const;

/**
 * Position the leaf exactly over a page, in the coordinates of the dialog it's
 * absolutely placed in, and show it. It takes the page's corners too, so the
 * cover on it hides the page's.
 */
export function placeLeaf(
  fly: HTMLElement,
  page: HTMLElement,
  stage: HTMLElement,
) {
  const box = page.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const style = getComputedStyle(page);
  fly.style.left = `${box.left - stageBox.left - stage.clientLeft}px`;
  fly.style.top = `${box.top - stageBox.top - stage.clientTop}px`;
  fly.style.width = `${box.width}px`;
  fly.style.height = `${box.height}px`;
  for (const corner of corners) fly.style[corner] = style[corner];
  fly.dataset.leaf = "flying";
}

/**
 * The transform that draws an element laid out at `to` over the `from` box,
 * with a top-left transform origin.
 */
function boxTransform(from: DOMRect, to: DOMRect) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

/**
 * Keyframes for the cover flying between its own box `at` and a cover on
 * screen at `from`, `in` from that cover or `out` back to it.
 */
function coverFrames(from: DOMRect, at: DOMRect, direction: "in" | "out") {
  const frames: Keyframe[] = [
    { transform: boxTransform(from, at) },
    { transform: "none" },
  ];
  return direction === "in" ? frames : frames.toReversed();
}

/**
 * Keyframes sampled along a flight between the cover's own box `at` and a
 * cover on screen at `from`, for parts countering the cover's stretch, which
 * isn't linear in the flight's progress. `frame` gets a lerp toward `from` and
 * the cover's scale at that point.
 */
function sampleFlight(
  from: DOMRect,
  at: DOMRect,
  direction: "in" | "out",
  frame: (
    lerp: (a: number, b: number) => number,
    scaleX: number,
    scaleY: number,
  ) => Keyframe,
) {
  const steps = 8;
  return Array.from({ length: steps + 1 }, (_, step): Keyframe => {
    const toward = direction === "out" ? step / steps : 1 - step / steps;
    const lerp = (a: number, b: number) => a + (b - a) * toward;
    return {
      ...frame(
        lerp,
        lerp(at.width, from.width) / at.width,
        lerp(at.height, from.height) / at.height,
      ),
      offset: step / steps,
    };
  });
}

/**
 * Keyframes for the cover's face as it flies. The cover changes aspect on the
 * way, but the face is photocard-shaped in every cover, so it's counter-scaled
 * to only move and grow, from filling the cover at `from` to its own box
 * `face`, centred on the stretched cover.
 */
function faceFrames(
  from: DOMRect,
  at: DOMRect,
  face: DOMRect,
  direction: "in" | "out",
) {
  return sampleFlight(from, at, direction, (lerp, scaleX, scaleY) => {
    const x =
      (lerp(face.left, from.left) - lerp(at.left, from.left)) / scaleX -
      (face.left - at.left);
    const y =
      (lerp(face.top, from.top) - lerp(at.top, from.top)) / scaleY -
      (face.top - at.top);
    return {
      transform: `translate(${x}px, ${y}px) scale(${lerp(face.width, from.width) / (face.width * scaleX)}, ${lerp(face.height, from.height) / (face.height * scaleY)})`,
    };
  });
}

/**
 * Keyframes for the cover's board as it flies, its corners turning from those
 * of the cover at `from` into those of the page it lands on, counter-scaled so
 * they stay round as the cover stretches.
 */
function boardFrames(
  from: DOMRect,
  at: DOMRect,
  source: CSSStyleDeclaration,
  landing: CSSStyleDeclaration,
  direction: "in" | "out",
) {
  return sampleFlight(from, at, direction, (lerp, scaleX, scaleY) => {
    const radii = corners.map((corner) =>
      lerp(parseFloat(landing[corner]), parseFloat(source[corner])),
    );
    return {
      borderRadius: `${radii.map((radius) => `${radius / scaleX}px`).join(" ")} / ${radii.map((radius) => `${radius / scaleY}px`).join(" ")}`,
    };
  });
}

/**
 * The cover to fly from or back to, or null once it's gone or scrolled out of
 * view, when there's nowhere sensible to fly to.
 */
export function visibleCover(element: HTMLElement | undefined) {
  if (element === undefined || !element.isConnected) return null;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight
    ? element
    : null;
}

type Play = (
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) => Promise<void>;

/**
 * Fly the cover between where it's laid out and `cover` on screen, `in` from
 * that cover or `out` back to it, resolving when it lands.
 */
export function playFlight(
  play: Play,
  fly: HTMLElement,
  cover: HTMLElement,
  direction: "in" | "out",
  options: KeyframeAnimationOptions,
) {
  const from = cover.getBoundingClientRect();
  const at = fly.getBoundingClientRect();
  for (const face of fly.querySelectorAll("[data-cover-face]")) {
    void play(
      face,
      faceFrames(from, at, face.getBoundingClientRect(), direction),
      options,
    );
  }
  const board = fly.querySelector("[data-cover-board]");
  const source = cover.querySelector("[data-cover-board]");
  if (board !== null && source !== null) {
    void play(
      board,
      boardFrames(
        from,
        at,
        getComputedStyle(source),
        getComputedStyle(board),
        direction,
      ),
      options,
    );
  }
  return play(fly, coverFrames(from, at, direction), options);
}

/**
 * Run an animation sequence that can be cut short. Cancelling stops every
 * animation it started, and a cancelled step never resolves, so the rest of
 * the sequence never runs.
 */
export function runSequence(steps: (run: { play: Play }) => Promise<void>) {
  const running = new Set<Animation>();
  let cancelled = false;

  const play: Play = (element, keyframes, options) =>
    new Promise((resolve) => {
      const animation = element.animate(keyframes, options);
      running.add(animation);
      animation.addEventListener("finish", () => {
        if (!cancelled) resolve();
      });
    });

  void steps({ play });

  return {
    cancel() {
      cancelled = true;
      for (const animation of running) animation.cancel();
    },
  };
}
