"use client";

import { Toggle } from "@/components/ui/toggle";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function GuestThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <Toggle
      variant="ghost"
      size="sm"
      pressed={theme === "dark"}
      onPressedChange={(v) => setTheme(v ? "dark" : "light")}
    >
      {theme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Toggle>
  );
}
