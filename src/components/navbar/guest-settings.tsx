import { Languages, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/i18n/messages";
import { getLocale, setLocale } from "@/i18n/runtime";

export default function GuestSettings() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Languages className="size-6 shrink-0 drop-shadow-lg hover:cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeSubmenu />
        <LanguageSubmenu />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSubmenu() {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  function handleThemeChange(value: string) {
    startTransition(() => {
      setTheme(value);
    });
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isPending}>
        {m.settings_theme()}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4 shrink-0" />
            <span>{m.settings_theme_dark()}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4 shrink-0" />
            <span>{m.settings_theme_light()}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function LanguageSubmenu() {
  const locale = getLocale();

  function handleLanguageChange(value: string) {
    setLocale(value as typeof locale);
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{m.settings_language()}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={handleLanguageChange}
        >
          <DropdownMenuRadioItem value="en">
            {m.settings_language_english()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ko">
            {m.settings_language_korean()}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
