import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PropsWithClassName<T> = T & { className?: string };

export function pad(n: string) {
  n = n + "";
  return n.length >= 5 ? n : new Array(5 - n.length + 1).join("0") + n;
}
