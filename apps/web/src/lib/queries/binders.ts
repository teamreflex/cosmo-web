import { queryOptions } from "@tanstack/react-query";
import {
  $fetchBinder,
  $fetchBinderMenu,
  $fetchBinderShelf,
} from "../functions/binders";

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
 * Slugs are stored lowercase and match case-insensitively, so the key is
 * lowercase too, and a mixed-case URL shares the entry that edits write to.
 */
export const binderQuery = (userId: string, slug: string) =>
  queryOptions({
    queryKey: ["binder", userId, slug.toLowerCase()],
    queryFn: ({ signal }) => $fetchBinder({ signal, data: { userId, slug } }),
  });

/**
 * Every objekt's "Add to binder" menu. Creating, renaming or deleting a
 * binder, or changing its pockets, resets them all.
 */
export const binderMenuKey = ["binder-menu"];

/**
 * Fetch the signed-in user's binders for the "Add to binder" menu, marking
 * the ones already holding the objekt. Loaded when the menu opens.
 */
export const binderMenuQuery = (tokenId: number) =>
  queryOptions({
    queryKey: [...binderMenuKey, tokenId],
    queryFn: ({ signal }) => $fetchBinderMenu({ signal, data: { tokenId } }),
  });
