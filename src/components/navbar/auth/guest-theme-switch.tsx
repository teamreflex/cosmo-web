"use client";

import { Toggle } from "@/components/ui/toggle";
import { LuMoon, LuSun } from "react-icons/lu";
import { useTheme } from "next-themes";

export default function GuestThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <Toggle
      variant="ghost"
      size="icon"
      pressed={theme === "dark"}
      onPressedChange={(v) => setTheme(v ? "dark" : "light")}
    >
      {theme === "dark" ? (
        <LuMoon className="size-8" />
      ) : (
        <LuSun className="size-8" />
      )}
    </Toggle>
  );
}
