import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { createPortal } from "react-dom";

type Props = PropsWithChildren<{
  to: string;
}>;

export default function Portal({ children, to }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setMounted(true);
  }, []);

  return mounted ? createPortal(children, document.querySelector(to)!) : null;
}
