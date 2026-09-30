import type { binderQuery } from "@/lib/queries/binders";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * How every part of the binder viewer reads the open binder, so they share
 * one cache entry and load together.
 */
export type BinderOptions = ReturnType<typeof binderQuery>;

/**
 * The open binder, suspending until it loads. One that's gone, such as a
 * binder deleted since its cover was drawn, throws for the viewer to report.
 */
export function useBinderDetail(binderOptions: BinderOptions) {
  const { data } = useSuspenseQuery(binderOptions);
  if (data === null) throw new ExpectedError("binder_not_found");
  return data;
}
