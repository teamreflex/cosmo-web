import { type Theme, ThemeProviderContext } from "@/hooks/use-theme";
import { ScriptOnce } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

const MEDIA = "(prefers-color-scheme: dark)";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

/**
 * Runs before hydration so the first paint already has the right class.
 * It resolves the theme the same way as `parseTheme()` and `applyTheme()`.
 */
function getThemeScript(storageKey: string, defaultTheme: Theme) {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultTheme);

  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('${MEDIA}').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

function parseTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : null;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia(MEDIA).matches
        ? "dark"
        : "light"
      : theme;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/**
 * Based on https://ui.shadcn.com/docs/dark-mode/tanstack-start.
 * The server can't read localStorage, so `theme` starts as `defaultTheme` and
 * picks up the stored value after mount; `getThemeScript()` covers the gap.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- localStorage is only readable after mount
    setThemeState(parseTheme(localStorage.getItem(storageKey)) ?? defaultTheme);
    setMounted(true);
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const media = window.matchMedia(MEDIA);
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, mounted]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        localStorage.setItem(storageKey, next);
        setThemeState(next);
      },
    }),
    [theme, storageKey],
  );

  return (
    <ThemeProviderContext value={value}>
      <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
      {children}
    </ThemeProviderContext>
  );
}
