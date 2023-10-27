import { TypedActionResult } from "@/lib/server/typed-action";
import { useState } from "react";

type LoadingState = "idle" | "loading" | "success" | "error";

export function useAction<T>(
  action: (form: FormData) => Promise<TypedActionResult<T>>,
  hooks?: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
) {
  const [state, setState] = useState<LoadingState>("idle");
  const [formAction] = useState(() => action);

  async function execute(form: FormData) {
    setState("loading");
    const result = await formAction(form);
    if (result.success) {
      setState("success");
      if (hooks?.onSuccess) {
        hooks.onSuccess(result.data);
      }
    } else {
      setState("error");
      if (hooks?.onError) {
        hooks.onError(result.error);
      }
    }
  }

  return [state, execute] as const;
}
