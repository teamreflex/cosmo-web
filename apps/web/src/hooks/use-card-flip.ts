import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, PointerEvent, RefObject } from "react";

/** A pause this long before releasing means the flick is over. */
const STALE_VELOCITY_MS = 80;

type CardSize = {
  width: number;
  height: number;
  outline: Point[];
};

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  startRotation: number;
  startTilt: number;
  /** Set once the pointer clears the tap threshold: a drag, not a tap. */
  moved: boolean;
  /** Rendered size over layout size, for pointer input under a scaled ancestor. */
  scale: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
};

type CardFlip = {
  sceneRef: RefObject<HTMLDivElement | null>;
  frontRef: RefObject<HTMLDivElement | null>;
  backRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  edgeRef: RefObject<SVGPathElement | null>;
  flipped: boolean;
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  };
};

/**
 * Drives the objekt flip: drag horizontally to turn the card, vertically to
 * tilt it, release to spring onto the nearest face, tap to flip.
 *
 * The transform is written straight to the DOM rather than through React,
 * because it changes every frame while the card is moving.
 */
export function useCardFlip(): CardFlip {
  const rotation = useMotionValue(0);
  const tilt = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);

  const sceneRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);

  const sizeRef = useRef<CardSize>({ width: 0, height: 0, outline: [] });
  const bodyRef = useRef<Point[]>([]);
  const dragRef = useRef<Drag | null>(null);
  const flippedRef = useRef(false);

  // #region rendering
  const render = useCallback(() => {
    const front = frontRef.current;
    const back = backRef.current;
    const edge = edgeRef.current;
    if (!front || !back || !edge) return;

    const currentRotation = rotation.get();
    const currentTilt = tilt.get();
    const frontMatrix = getFaceMatrix(
      currentRotation,
      currentTilt,
      PERSPECTIVE,
      0,
    );
    const backMatrix = getFaceMatrix(
      currentRotation,
      currentTilt,
      PERSPECTIVE,
      180,
    );

    front.style.transform = `matrix3d(${frontMatrix.join(",")})`;
    back.style.transform = `matrix3d(${backMatrix.join(",")})`;

    const frontVisible = isFaceVisible(currentRotation, 0);
    front.style.visibility = frontVisible ? "visible" : "hidden";
    back.style.visibility = isFaceVisible(currentRotation, 180)
      ? "visible"
      : "hidden";

    const body = getSilhouette(
      frontMatrix,
      backMatrix,
      sizeRef.current.outline,
    );
    bodyRef.current = body;
    edge.setAttribute(
      "d",
      body.length === 0
        ? ""
        : `M${body.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join("L")}Z`,
    );
    edge.style.opacity = String(getEdgeOpacity(currentRotation, currentTilt));

    if (flippedRef.current !== !frontVisible) {
      flippedRef.current = !frontVisible;
      setFlipped(!frontVisible);
    }
  }, [rotation, tilt]);

  useEffect(() => {
    const unsubscribes = [
      rotation.on("change", render),
      tilt.on("change", render),
    ];
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [render, rotation, tilt]);
  // #endregion

  // #region measurement

  useEffect(() => {
    const scene = sceneRef.current;
    const front = frontRef.current;
    const svg = svgRef.current;
    if (!scene || !front || !svg) return;

    const measure = () => {
      // layout size, not the visual box: the card mounts inside a dialog that
      // animates in from a scale, and a transform never refires the observer
      const width = scene.offsetWidth;
      const height = scene.offsetHeight;
      // the photocard radius is container-relative, so read it back in pixels
      const radius =
        Number.parseFloat(getComputedStyle(front).borderTopLeftRadius) || 0;
      sizeRef.current = {
        width,
        height,
        outline: getCardOutline(width, height, radius),
      };
      // one unit per pixel, with the origin at the card's centre
      svg.setAttribute(
        "viewBox",
        `${-width / 2} ${-height / 2} ${width} ${height}`,
      );
      render();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    return () => observer.disconnect();
  }, [render]);
  // #endregion

  // #region gesture

  const settle = useCallback(
    (face: number) => {
      const transition = reducedMotion ? { duration: 0 } : FLIP_SPRING;
      animate(rotation, face * 180, transition);
      animate(tilt, 0, transition);
    },
    [reducedMotion, rotation, tilt],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const scene = sceneRef.current;
      // one pointer at a time, primary button only
      if (!scene || dragRef.current || !event.isPrimary || event.button !== 0) {
        return;
      }
      // let overlaid controls (the audio toggle, links) keep their own gestures
      if (
        event.target instanceof Element &&
        event.target.closest("button, a")
      ) {
        return;
      }

      const rect = scene.getBoundingClientRect();
      const scale =
        rect.width > 0 ? rect.width / (sizeRef.current.width || rect.width) : 1;
      const x = (event.clientX - (rect.left + rect.width / 2)) / scale;
      const y = (event.clientY - (rect.top + rect.height / 2)) / scale;
      // the gesture only starts inside the card's projected silhouette
      if (!containsPoint(bodyRef.current, x, y)) return;

      rotation.stop();
      tilt.stop();
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRotation: rotation.get(),
        startTilt: tilt.get(),
        moved: false,
        scale,
        lastX: event.clientX,
        lastTime: event.timeStamp,
        velocityX: 0,
      };
      scene.setPointerCapture(event.pointerId);
    },
    [rotation, tilt],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const translationX = (event.clientX - drag.startX) / drag.scale;
      const translationY = (event.clientY - drag.startY) / drag.scale;

      if (!drag.moved) {
        if (Math.hypot(translationX, translationY) <= TAP_MAX_DISTANCE) return;
        drag.moved = true;
      }

      const { width, height } = sizeRef.current;
      rotation.set(getDragRotation(drag.startRotation, translationX, width));
      tilt.set(getDragTilt(drag.startTilt, translationY, height));

      const elapsed = event.timeStamp - drag.lastTime;
      if (elapsed > 0) {
        drag.velocityX =
          ((event.clientX - drag.lastX) / drag.scale / elapsed) * 1000;
      }
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
    },
    [rotation, tilt],
  );

  /**
   * A cancelled gesture is not a tap, and a paused drag is not a flick — so
   * neither can flip the card on its own.
   */
  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, released: boolean) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;

      const scene = sceneRef.current;
      if (scene?.hasPointerCapture(event.pointerId)) {
        scene.releasePointerCapture(event.pointerId);
      }

      if (!drag.moved) {
        settle(
          released
            ? getTappedFace(rotation.get())
            : Math.round(rotation.get() / 180),
        );
        return;
      }

      const stale = event.timeStamp - drag.lastTime > STALE_VELOCITY_MS;
      settle(
        getReleasedFace(
          drag.startRotation,
          rotation.get(),
          released && !stale ? drag.velocityX : 0,
          sizeRef.current.width,
        ),
      );
    },
    [rotation, settle],
  );

  // #endregion

  // #region keyboard
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // keys pressed on overlaid controls (the audio toggle) belong to them
      if (event.target !== event.currentTarget) return;

      const face = Math.round(rotation.get() / 180);
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        settle(getTappedFace(rotation.get()));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        settle(face - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        settle(face + 1);
      }
    },
    [rotation, settle],
  );
  // #endregion

  return {
    sceneRef,
    frontRef,
    backRef,
    svgRef,
    edgeRef,
    flipped,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event) => endDrag(event, true),
      onPointerCancel: (event) => endDrag(event, false),
      onLostPointerCapture: (event) => endDrag(event, false),
      onKeyDown,
      // browsers will otherwise start a native image drag out of the card
      onDragStart: (event) => event.preventDefault(),
    },
  };
}

// #region geometry
/**
 * Card flip geometry based on COSMO's own interaction.
 *
 * Constants, timings and styling have been taken from COSMO to ensure parity.
 * Implementation is our own.
 */

/** Thickness of the card in pixels — what you see edge-on at 90 degrees. */
const CARD_THICKNESS = 3;
/** The tilt a vertical drag approaches but never reaches. */
const TILT_LIMIT = 30;
/** How much of the card's own width a full 180 degree turn costs. */
const DRAG_SENSITIVITY = 0.85;
const TURN_PER_WIDTH = 180;
const TILT_PER_HEIGHT = 60;
/** Seconds of release velocity folded into where a flick lands. */
const FLICK_PROJECTION = 0.15;
/** Samples per rounded corner when tracing the card's outline. */
const CORNER_SAMPLES = 9;
/** Mid-turn the card leans toward the viewer: it grows and rises by this much. */
const LEAN_SCALE = 0.035;
const LEAN_RISE = 6;
/** The edge reaches full opacity within a few degrees of flat. */
const EDGE_FADE = 10;

export const PERSPECTIVE = 1000;
/** A pointer that travels further than this is a drag, not a tap. */
export const TAP_MAX_DISTANCE = 10;
/** The paper core you see along the card's edge. */
export const CARD_EDGE_COLOR = "#d0d7dd";
export const FLIP_SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 180,
  mass: 0.8,
} as const;

export type Point = readonly [number, number];

/** A 4x4 in the column-major order `matrix3d()` takes: index `column * 4 + row`. */
export type CardMatrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function multiply(a: CardMatrix, b: CardMatrix): CardMatrix {
  const cell = (row: number, column: number) =>
    (a[row] ?? 0) * (b[column * 4] ?? 0) +
    (a[4 + row] ?? 0) * (b[column * 4 + 1] ?? 0) +
    (a[8 + row] ?? 0) * (b[column * 4 + 2] ?? 0) +
    (a[12 + row] ?? 0) * (b[column * 4 + 3] ?? 0);

  return [
    cell(0, 0),
    cell(1, 0),
    cell(2, 0),
    cell(3, 0),
    cell(0, 1),
    cell(1, 1),
    cell(2, 1),
    cell(3, 1),
    cell(0, 2),
    cell(1, 2),
    cell(2, 2),
    cell(3, 2),
    cell(0, 3),
    cell(1, 3),
    cell(2, 3),
    cell(3, 3),
  ];
}

function rotationX(radians: number): CardMatrix {
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  return [1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1];
}

function rotationY(radians: number): CardMatrix {
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  return [cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1];
}

function scaling(factor: number): CardMatrix {
  return [factor, 0, 0, 0, 0, factor, 0, 0, 0, 0, factor, 0, 0, 0, 0, 1];
}

function translation(x: number, y: number, z: number): CardMatrix {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

/** Divides by depth, so the matrix carries its own projection. */
function projection(distance: number): CardMatrix {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / distance, 0, 0, 0, 1];
}

/** Applies the matrix to a point, leaving the homogeneous divide to the caller. */
function transform(
  matrix: CardMatrix,
  x: number,
  y: number,
  z: number,
): readonly [number, number, number, number] {
  const component = (row: number) =>
    (matrix[row] ?? 0) * x +
    (matrix[4 + row] ?? 0) * y +
    (matrix[8 + row] ?? 0) * z +
    (matrix[12 + row] ?? 0);

  return [component(0), component(1), component(2), component(3)];
}

/**
 * Reads outward as the stack of moves that place one face: project it, lift it
 * toward the viewer at the midpoint of the turn, scale, tilt, turn, then push
 * it out to its own side of the card. `faceOffset` is 180 for the back.
 *
 * Because the projection is part of the matrix, the result needs no parent
 * `perspective` or `transform-style` to render correctly.
 */
export function getFaceMatrix(
  rotation: number,
  tilt: number,
  perspective: number,
  faceOffset: number,
): CardMatrix {
  const lean = Math.abs(Math.sin(toRadians(rotation)));

  return [
    projection(perspective),
    translation(0, -LEAN_RISE * lean, 0),
    scaling(1 + LEAN_SCALE * lean),
    rotationX(toRadians(tilt)),
    rotationY(toRadians(rotation + faceOffset)),
    translation(0, 0, CARD_THICKNESS / 2),
  ].reduce(multiply);
}

/** Maps a point on a face, which lies flat at z = 0, into screen space. */
export function projectPoint(matrix: CardMatrix, x: number, y: number): Point {
  const [screenX, screenY, , w] = transform(matrix, x, y, 0);
  return [screenX / w, screenY / w];
}

/** Positive when `point` falls to one side of the directed edge, negative the other. */
function sideOfEdge(from: Point, to: Point, point: Point): number {
  const edgeX = to[0] - from[0];
  const edgeY = to[1] - from[1];
  return edgeX * (point[1] - from[1]) - edgeY * (point[0] - from[0]);
}

/** Traces the card's rounded rectangle, centred on the origin. */
export function getCardOutline(
  width: number,
  height: number,
  radius: number,
): Point[] {
  const corner = Math.min(radius, Math.min(width, height) / 2);
  const insetX = width / 2 - corner;
  const insetY = height / 2 - corner;
  const quarterTurn = Math.PI / 2;

  // clockwise from the top edge, each corner sweeping a quarter turn
  const arcs = [
    { x: insetX, y: -insetY, from: -quarterTurn },
    { x: insetX, y: insetY, from: 0 },
    { x: -insetX, y: insetY, from: quarterTurn },
    { x: -insetX, y: -insetY, from: quarterTurn * 2 },
  ];

  return arcs.flatMap((arc) =>
    Array.from({ length: CORNER_SAMPLES }, (_, step): Point => {
      const angle = arc.from + (step / (CORNER_SAMPLES - 1)) * quarterTurn;
      return [
        arc.x + corner * Math.cos(angle),
        arc.y + corner * Math.sin(angle),
      ];
    }),
  );
}

/**
 * Andrew's monotone chain. Sort by x then y, sweep once forwards for one half
 * of the hull and once backwards for the other, dropping where they meet.
 */
function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const sweep = (ordered: readonly Point[]): Point[] => {
    const chain: Point[] = [];
    for (const point of ordered) {
      for (;;) {
        const last = chain[chain.length - 1];
        const previous = chain[chain.length - 2];
        const turns =
          last === undefined ||
          previous === undefined ||
          sideOfEdge(previous, last, point) > 0;
        if (turns) break;
        chain.pop();
      }
      chain.push(point);
    }
    // the endpoint belongs to the other half
    chain.pop();
    return chain;
  };

  return [...sweep(sorted), ...sweep([...sorted].reverse())];
}

/**
 * The silhouette of the solid card: the hull around both projected faces.
 * Mid-turn this is what shows the card's edge; flat on, it collapses back to
 * the outline of a single face.
 */
export function getSilhouette(
  front: CardMatrix,
  back: CardMatrix,
  outline: readonly Point[],
): Point[] {
  return convexHull(
    outline.flatMap(([x, y]) => [
      projectPoint(front, x, y),
      // the back face is mirrored, so its outline runs the other way
      projectPoint(back, -x, y),
    ]),
  );
}

/** The silhouette is convex and wound one way, so inside means left of every edge. */
export function containsPoint(
  outline: readonly Point[],
  x: number,
  y: number,
): boolean {
  if (outline.length < 3) return false;
  return outline.every((from, index) => {
    const to = outline[(index + 1) % outline.length];
    return to === undefined || sideOfEdge(from, to, [x, y]) >= 0;
  });
}

/** A face is drawn only while it points at the viewer. */
export function isFaceVisible(rotation: number, faceOffset: number): boolean {
  return Math.cos(toRadians(rotation + faceOffset)) > 0.001;
}

/** The edge fades in as soon as the card leaves flat, on either axis. */
export function getEdgeOpacity(rotation: number, tilt: number): number {
  const lean = Math.max(
    Math.abs(Math.sin(toRadians(rotation))),
    Math.abs(Math.sin(toRadians(tilt))),
  );
  return clamp(lean * EDGE_FADE, 0, 1);
}

/** Degrees of turn per pixel of horizontal drag. */
function degreesPerPixel(width: number): number {
  return width > 0 ? (TURN_PER_WIDTH / width) * DRAG_SENSITIVITY : 0;
}

/**
 * Both axes stay live for the whole gesture. COSMO locks to whichever axis the
 * drag starts on and caps the other, which strands a drag that begins
 * vertically and then turns — the card sticks a few degrees off flat. Drift
 * during a genuine vertical drag turns the card about as far as COSMO's cap
 * allowed anyway, and anything under a half-turn settles back on release.
 */
export function getDragRotation(
  startRotation: number,
  translationX: number,
  width: number,
): number {
  const turn = translationX * degreesPerPixel(width);
  return startRotation + clamp(turn, -TURN_PER_WIDTH, TURN_PER_WIDTH);
}

export function getDragTilt(
  startTilt: number,
  translationY: number,
  height: number,
): number {
  if (height <= 0) return startTilt;
  // dragging up leans the top of the card toward the viewer, hence the sign
  const pull = -translationY * (TILT_PER_HEIGHT / height) * DRAG_SENSITIVITY;
  // the headroom left shrinks as the card already leans that way, and tanh
  // makes the approach asymptotic, so the limit is never actually reached
  const headroom = TILT_LIMIT - Math.sign(pull) * startTilt;
  return startTilt + headroom * Math.tanh(pull / TILT_LIMIT);
}

/**
 * Which face a release lands on. A flick coasts on for a moment, but can never
 * carry the card more than one face past where the drag began.
 */
export function getReleasedFace(
  startRotation: number,
  rotation: number,
  velocityX: number,
  width: number,
): number {
  const origin = Math.round(startRotation / 180);
  const coastTo =
    rotation + velocityX * degreesPerPixel(width) * FLICK_PROJECTION;
  return clamp(Math.round(coastTo / 180), origin - 1, origin + 1);
}

/** A tap turns the front one way, and the back returns along the same arc. */
export function getTappedFace(rotation: number): number {
  const face = Math.round(rotation / 180);
  return face % 2 === 0 ? face - 1 : face + 1;
}
// #endregion
