"use client";

import { PropsWithChildren, ReactNode, useEffect, useState } from "react";

type Props = PropsWithChildren<{
  fallback?: ReactNode;
}>;

export default function Hydrated({ children, fallback }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? children : fallback;
}
