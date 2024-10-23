import * as RadixVH from "@radix-ui/react-visually-hidden";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren;

export default function VisuallyHidden({ children }: Props) {
  return <RadixVH.Root>{children}</RadixVH.Root>;
}
