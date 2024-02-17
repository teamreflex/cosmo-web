import { TypedActionResult } from "@/lib/server/typed-action/types";
import { PropsWithClassName, cn } from "@/lib/utils";

type FieldErrorProps = PropsWithClassName<{
  state: TypedActionResult<unknown>;
  field: string;
}>;

export function FieldError({ className, state, field }: FieldErrorProps) {
  if (state.status !== "error") return null;

  const currentField = state.validationErrors?.[field];
  if (!currentField || currentField.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col text-red-500 text-sm font-semibold",
        className
      )}
    >
      {currentField.map((error, i) => (
        <p key={`${field}-${i}`}>{error}</p>
      ))}
    </div>
  );
}

type FormErrorProps = PropsWithClassName<{
  state: TypedActionResult<unknown>;
}>;

export function FormError({ className, state }: FormErrorProps) {
  if (state.status !== "error" || state.error === undefined) return null;
  return (
    <p
      className={cn(
        "flex flex-col text-red-500 text-sm font-semibold",
        className
      )}
    >
      {state.error}
    </p>
  );
}
