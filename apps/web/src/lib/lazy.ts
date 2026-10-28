import { noop } from "@tanstack/react-query";
import { isModuleNotFoundError } from "@tanstack/router-core";
import { lazy } from "react";
import type { ComponentType } from "react";

/**
 * `React.lazy()` plus a `preload()` that starts fetching the chunk early, such as when the pointer reaches a
 * trigger, so the component is usually ready by the time it renders.
 *
 * A failed fetch isn't cached, so a preload that failed on a flaky connection is retried when the component
 * renders. Like the router's own route chunks, rendering a chunk a newer deploy removed reloads the page once.
 */
export function lazyWithPreload<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
) {
  let pending: Promise<{ default: ComponentType<P> }> | undefined;

  function importOnce() {
    pending ??= load().catch((cause: unknown) => {
      pending = undefined;
      throw cause;
    });
    return pending;
  }

  return Object.assign(
    lazy(() =>
      importOnce().catch((cause: unknown) => {
        if (
          cause instanceof Error &&
          isModuleNotFoundError(cause) &&
          reloadOnce(cause.message)
        ) {
          return new Promise<never>(noop);
        }
        throw cause;
      }),
    ),
    { preload: () => void importOnce().catch(noop) },
  );
}

/**
 * Reloads for a missing chunk unless this tab already did, sharing the router's key so a route chunk and a lazy
 * component missing together reload once.
 */
function reloadOnce(message: string) {
  const key = `tanstack_router_reload:${message}`;
  if (sessionStorage.getItem(key) !== null) {
    return false;
  }
  sessionStorage.setItem(key, "1");
  window.location.reload();
  return true;
}
