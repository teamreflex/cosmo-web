import { VisuallyHidden as VisuallyHiddenPrimitive } from "radix-ui";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren;

export default function VisuallyHidden({ children }: Props) {
  return (
    <VisuallyHiddenPrimitive.Root>{children}</VisuallyHiddenPrimitive.Root>
  );
}
