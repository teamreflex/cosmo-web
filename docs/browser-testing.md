# Browser testing

How to check a change in a real browser with agent-browser; [testing.md](testing.md) covers when to check in the browser instead of writing a test.

## Builds

- Check against a production build. The Vite dev server reloads the page on first load while it optimizes dependencies, and has other dev-only quirks.
- `VITE_*` values are fixed at build time. A build served on a different port needs `VITE_BASE_URL` set to that port before it is built, or sign-in fails and pages hang.
- Collection search only works on `http://localhost:3000`, because of Typesense's CORS setting ([tooling.md](tooling.md#local-services)).
- Browsers scope cookies by host, not port, so signing in on one `localhost` port signs you in on all of them.

## Accounts and data

- Sign in with the staff seed accounts ([auth.md](auth.md#testing-locally)).
- Use `find role button click --name "Sign In" --exact`. Without `--exact` it also matches "Sign in with Discord".
- Prefix QA binders and lists with `qa `, so they are easy to find and delete. Their names allow only letters, numbers and spaces.

## Emulation

- Headless Chrome ignores CDP hover emulation, so Tailwind `hover:` styles only apply when Chrome is launched with `--blink-settings=primaryHoverType=2`. Because agent-browser's `--args` splits on commas, pass only one `key=value` to `--blink-settings`.
- `set device "iPhone 14"` sets the viewport and pixel ratio, but not touch. For touch, enable `Emulation.setTouchEmulationEnabled` from a CDP script that stays connected, and send `Input.dispatchTouchEvent` `touchStart` and `touchEnd` events at the element's centre.
- Don't use `Emulation.setEmitTouchEventsForMouse`, because it makes `click` hang. Under touch emulation, mouse drags also fail with `pointercancel`.
- Pass explicit `timestamp`s on synthetic swipe events so gesture code doesn't read them as a slow drag. Omit `timestamp`s when testing native scroll containers, because timestamped events barely move them.
- Many components prefetch on `onPointerEnter`. Send pointer events to trigger it; a synthetic `mouseover` does nothing.

## Drag and drop

dnd-kit only starts a drag after the mouse moves 8 px with the button held, so a plain `drag @a @b` does nothing.

1. `set viewport 1800 1000`, then `scrollintoview` the item you want to drag.
2. Read the source and target centres with `get box @ref`. `--json` prints nothing here.
3. `mouse move` to the source, then `mouse down left`.
4. Send 6–8 `mouse move`s towards the target, waiting about 80 ms between them.
5. `mouse up left`.
6. Take a new snapshot before the next drag, because refs go stale when the list re-renders.

## Measuring performance

- Don't use `react renders`, because it reports false remounts and production builds minify component names. Instead, add a temporary `console.count` and read it with `agent-browser console`, or summarise a `profiler` trace by its `RunTask` and `FunctionCall` events on `CrRendererMain`.
- The CPU profiler takes 60–250 ms to start, and that cost lands in the first JS task after `profiler start`, which makes the next interaction look slow. Run a throwaway `eval "1"` and wait about 900 ms before measuring.
- `vitals` reports INP only when the page was opened with `vitals <url>` before you interact.
- agent-browser has no CPU throttling command. Enable `Emulation.setCPUThrottlingRate` from a CDP script that stays connected; the setting lasts across reloads.
- Turn React DevTools off for timing traces, because it adds work to every commit.
- Calling `document.getAnimations()` every frame forces style and layout. To wait for animations, wrap `Element.prototype.animate` instead, and skip infinite ones (`getComputedTiming().endTime === Infinity`).
- Long gaps between frames only mean jank while the page is moving, so measure scrolling by scrolling a few pixels every frame instead of calling `scrollBy` once.

## Finding things on the page

- Objekt cells aren't `<button>`s, but `find role button --name "View objekt" --exact` finds them.
- The router's state is in `window.__TSR_ROUTER__.stores`.
