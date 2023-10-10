"use client";

import { PropsWithChildren, useEffect, useState } from "react";

export default function StoreHydrated({ children }: PropsWithChildren) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return <>{isHydrated ? <div>{children}</div> : null}</>;
}
