import { getUser } from "@/app/api/common";
import * as z from "zod";
import { getErrorMessage } from "../error";
import { TokenPayload } from "../universal/auth";

export type TypedActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

type ValidForm = FormData | Record<string, unknown>;

/**
 * Create a Zod-validated server form action.
 */
export async function typedAction<TResponse, TSchema extends z.AnyZodObject>(
  schema: TSchema,
  form: ValidForm,
  callback: (data: z.infer<TSchema>) => Promise<TResponse>
): Promise<TypedActionResult<TResponse>> {
  const input =
    form instanceof FormData ? Object.fromEntries(form.entries()) : form;
  const result = schema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join("\n"),
    };
  }

  try {
    const response = await callback(result.data);
    return { success: true, data: response };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Create an authenticated & Zod-validated server form action.
 */
export async function authenticatedAction<
  TResponse,
  TSchema extends z.AnyZodObject
>(
  schema: TSchema,
  form: ValidForm,
  callback: (data: z.infer<TSchema>, user: TokenPayload) => Promise<TResponse>
): Promise<TypedActionResult<TResponse>> {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  return typedAction(schema, form, (data) => callback(data, auth.user));
}
