"use client";

import { Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";

export default function GuestThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      setTheme((prev) => (prev === "light" ? "dark" : "light"));
    });
  }

  return (
    <button onClick={handleClick}>
      {isPending ? (
        <Loader2 className="size-8 animate-spin" />
      ) : theme === "dark" ? (
        <Moon className="size-8" />
      ) : (
        <Sun className="size-8" />
      )}
    </button>
  );
}
