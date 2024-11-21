"use client";

import { PropsWithChildren, ReactNode, useSyncExternalStore } from "react";

type Props = PropsWithChildren<{
  fallback?: ReactNode;
}>;

const subscriber = () => () => {};

export default function Hydrated({ children, fallback }: Props) {
  const isServer = useSyncExternalStore(
    subscriber,
    () => false,
    () => true
  );

  return isServer ? fallback : children;
}
