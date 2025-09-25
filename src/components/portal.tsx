import { type PropsWithChildren, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = PropsWithChildren<{
  to: string;
}>;

/**
 * using useSyncExternalStore results in missing DOM element errors
 */
export default function Portal({ children, to }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.querySelector(to)!) : null;
}
