import { getUser } from "@/app/api/common";
import { z } from "zod";
import { TokenPayload } from "./jwt";
import { getErrorMessage } from "../error";

export type TypedActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Create a Zod-validated server form action.
 * @param schema {@link z.ZodObject} - Zod schema to validate form data
 * @param form {@link FormData} - Form data from the request
 * @param callback {@link (data: z.infer<TSchema>) => Promise<TResponse>} - callback to execute upon successful validation
 */
export async function typedAction<TResponse, TSchema extends z.AnyZodObject>(
  schema: TSchema,
  form: FormData,
  callback: (data: z.infer<TSchema>) => Promise<TResponse>
): Promise<TypedActionResult<TResponse>> {
  const result = schema.safeParse(Object.fromEntries(form.entries()));
  if (!result.success) {
    return { success: false, error: "Invalid formData" };
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
 * @param schema {@link z.ZodObject} - Zod schema to validate form data
 * @param form {@link FormData} - Form data from the request
 * @param callback {@link (data: z.infer<TSchema>) => Promise<TResponse>} - callback to execute upon successful validation
 */
export async function authenticatedAction<
  TResponse,
  TSchema extends z.AnyZodObject
>(
  schema: TSchema,
  form: FormData,
  callback: (data: z.infer<TSchema>, user: TokenPayload) => Promise<TResponse>
): Promise<TypedActionResult<TResponse>> {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  return typedAction(schema, form, (data) => callback(data, auth.user));
}
