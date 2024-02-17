import { TokenPayload } from "@/lib/universal/auth";
import { z } from "zod";

export type ActionResultSuccess<T> = {
  status: "success";
  data: T;
};

export type ActionResultError = {
  status: "error";
  error?: string;
  validationErrors?: Record<string, string[] | undefined>;
};

export type ActionResultIdle = {
  status: "idle";
};

export type TypedActionResult<T> =
  | ActionResultSuccess<T>
  | ActionResultError
  | ActionResultIdle;

type ValidForm = FormData | Record<string, unknown>;

interface BaseAction<TResponse, TSchema extends z.Schema> {
  /** Input data */
  form: ValidForm;

  /** Zod schema to validate the input */
  schema: TSchema;

  /** Optionally redirect on callback success */
  redirectTo?: ({ result }: { result: TResponse }) => string;
}

export interface Action<TResponse, TSchema extends z.Schema>
  extends BaseAction<TResponse, TSchema> {
  /** Callback to execute on validation success */
  onValidate: ({ data }: { data: z.infer<TSchema> }) => Promise<TResponse>;
}

export interface AuthenticatedAction<TResponse, TSchema extends z.Schema>
  extends BaseAction<TResponse, TSchema> {
  /** Callback to execute after auth but before validation */
  onAuthenticate?: ({ user }: { user: TokenPayload }) => Promise<unknown>;

  /** Callback to execute on auth and validation success */
  onValidate: ({
    data,
    user,
  }: {
    data: z.infer<TSchema>;
    user: TokenPayload;
  }) => Promise<TResponse>;
}
