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
 * Position the leaf exactly over a page, in the coordinates of the dialog it's
 * absolutely placed in, and show it.
 */
export function placeLeaf(
  fly: HTMLElement,
  page: HTMLElement,
  stage: HTMLElement,
) {
  const box = page.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  fly.style.left = `${box.left - stageBox.left - stage.clientLeft}px`;
  fly.style.top = `${box.top - stageBox.top - stage.clientTop}px`;
  fly.style.width = `${box.width}px`;
  fly.style.height = `${box.height}px`;
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
 * screen at `from`, `in` from that cover or `out` back to it. The box changes
 * aspect on the way, so the artwork and label are counter-scaled to keep their
 * shape, and land exactly where that cover draws them.
 */
export function flightFrames(
  from: DOMRect,
  at: DOMRect,
  direction: "in" | "out",
) {
  const scaleX = from.width / at.width;
  const scaleY = from.height / at.height;
  // the counter-scale isn't linear in the flight's progress, so it's sampled
  const steps = 8;
  const progress = (step: number) =>
    direction === "out" ? step / steps : 1 - step / steps;

  const ends: Keyframe[] = [
    { transform: boxTransform(from, at) },
    { transform: "none" },
  ];

  return {
    fly: direction === "in" ? ends : ends.toReversed(),
    content: Array.from({ length: steps + 1 }, (_, step): Keyframe => {
      const p = progress(step);
      return {
        offset: step / steps,
        transform: `scaleY(${(1 + (scaleX - 1) * p) / (1 + (scaleY - 1) * p)})`,
      };
    }),
  };
}

/**
 * Where a cover sits on screen, or null once it's gone or scrolled out of
 * view, when there's nowhere sensible to fly to.
 */
export function visibleBox(element: HTMLElement | undefined) {
  if (element === undefined || !element.isConnected) return null;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight
    ? box
    : null;
}

type Play = (
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) => Promise<void>;

/**
 * Play a flight from `flightFrames` on the flying cover and its contents,
 * resolving when it lands.
 */
export function playFlight(
  play: Play,
  fly: HTMLElement,
  frames: ReturnType<typeof flightFrames>,
  options: KeyframeAnimationOptions,
) {
  for (const part of fly.querySelectorAll(
    "[data-cover-art], [data-cover-label]",
  )) {
    void play(part, frames.content, options);
  }
  return play(fly, frames.fly, options);
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
