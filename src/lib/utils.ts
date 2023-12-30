import { type ClassValue, clsx } from "clsx";
import { memo } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PropsWithClassName<T> = T & { className?: string };

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * A typed version of React.memo
 */
export const typedMemo: <T>(
  component: T,
  propsAreEqual?: (
    prevProps: React.PropsWithChildren<T>,
    nextProps: React.PropsWithChildren<T>
  ) => boolean
) => T = memo;
