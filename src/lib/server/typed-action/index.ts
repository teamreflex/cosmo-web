import * as z from "zod";
import { getErrorMessage } from "../../error";
import { redirect } from "next/navigation";
import { Action, AuthenticatedAction, TypedActionResult } from "./types";
import { ActionError } from "./errors";
import { getUser } from "@/app/api/common";

/**
 * Create a Zod-validated server form action.
 */
export async function typedAction<TResponse, TSchema extends z.Schema>({
  form,
  schema,
  onValidate,
  redirectTo,
}: Action<TResponse, TSchema>): Promise<TypedActionResult<TResponse>> {
  const input =
    form instanceof FormData ? Object.fromEntries(form.entries()) : form;

  const result = schema.safeParse(input);

  if (result.success === false) {
    return {
      status: "error",
      validationErrors: result.error.flatten().fieldErrors,
    };
  }

  /**
   * validate and execute callback
   * redirects use thrown promises, so using them inside a try-catch does not work
   */
  try {
    var response = await onValidate({ data: result.data });
  } catch (err) {
    if (err instanceof ActionError) {
      return err.result;
    }

    return { status: "error", error: getErrorMessage(err) };
  }

  // redirect if neccessary
  if (redirectTo) {
    redirect(redirectTo({ result: response }));
  }

  return { status: "success", data: response };
}

/**
 * Create an authenticated & Zod-validated server form action.
 */
export async function authenticatedAction<TResponse, TSchema extends z.Schema>({
  form,
  schema,
  onAuthenticate,
  onValidate,
  redirectTo,
}: AuthenticatedAction<TResponse, TSchema>): Promise<
  TypedActionResult<TResponse>
> {
  const auth = await getUser();
  if (!auth.success) {
    return { status: "error", error: "invalid user" };
  }

  // execute auth callback
  if (onAuthenticate) {
    try {
      await onAuthenticate({ user: auth.user });
    } catch (err) {
      if (err instanceof ActionError) {
        return err.result;
      }

      return { status: "error", error: getErrorMessage(err) };
    }
  }

  // validate and execute callback
  const result = await typedAction({
    schema,
    form,
    onValidate: ({ data }) => onValidate({ data, user: auth.user }),
  });

  // redirect if neccessary
  if (redirectTo && result.status === "success") {
    redirect(redirectTo({ result: result.data }));
  }

  // return result
  return result;
}
