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
  fly.dataset.flying = "";
}

/**
 * The transform that draws an element laid out at `to` over the `from` box,
 * with a top-left transform origin.
 */
export function boxTransform(from: DOMRect, to: DOMRect) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
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

type Steps = {
  play: Play;
  wait: (ms: number) => Promise<void>;
};

/**
 * Run an animation sequence that can be cut short. Cancelling stops every
 * animation and wait it started, and a cancelled step never resolves, so the
 * rest of the sequence never runs.
 */
export function runSequence(steps: (run: Steps) => Promise<void>) {
  const running = new Set<Animation>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let cancelled = false;

  const play: Play = (element, keyframes, options) =>
    new Promise((resolve) => {
      const animation = element.animate(keyframes, options);
      running.add(animation);
      animation.addEventListener("finish", () => {
        if (!cancelled) resolve();
      });
    });

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.add(setTimeout(resolve, ms));
    });

  void steps({ play, wait });

  return {
    cancel() {
      cancelled = true;
      for (const animation of running) animation.cancel();
      for (const timer of timers) clearTimeout(timer);
    },
  };
}
