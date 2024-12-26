import { PropsWithChildren } from "react";

export default function OverlayStatus({ children }: PropsWithChildren) {
  return <p className="pl-2">{children}</p>;
}
