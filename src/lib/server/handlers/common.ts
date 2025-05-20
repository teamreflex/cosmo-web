import type { NextRequest } from "next/server";

// route params should be a record of strings
export type RouteParams<T extends Record<string, string> = {}> = T;

// route props contains params, searchParams etc
export type RouteContext<TParams extends RouteParams> = {
  params: Promise<TParams>;
};

export type RouteHandler<
  TParams extends RouteParams,
  TPayload extends {} = {}
> = (
  props: {
    req: NextRequest;
    ctx: RouteContext<TParams>;
  } & TPayload
) => Promise<Response>;
