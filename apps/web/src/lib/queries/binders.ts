import { queryOptions } from "@tanstack/react-query";
import { $fetchBinder, $fetchBinderShelf } from "../functions/binders";

/**
 * Fetch a user's binders for the profile shelf. Keyed by user id so binder
 * mutations can refresh it regardless of how the profile was opened.
 */
export const binderShelfQuery = (userId: string) =>
  queryOptions({
    queryKey: ["binder-shelf", userId],
    queryFn: ({ signal }) => $fetchBinderShelf({ signal, data: { userId } }),
  });

/**
 * Fetch one binder with every page's entries, for the viewer and the editor.
 */
export const binderQuery = (userId: string, slug: string) =>
  queryOptions({
    queryKey: ["binder", userId, slug],
    queryFn: ({ signal }) => $fetchBinder({ signal, data: { userId, slug } }),
  });
