import { IconLanguage, IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "../theme-provider";
import type { Theme } from "../theme-provider";
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
        <IconLanguage className="size-6 shrink-0 drop-shadow-lg hover:cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        <ThemeSubmenu />
        <LanguageSubmenu />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSubmenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{m.settings_theme()}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          <DropdownMenuRadioItem value="dark">
            <IconMoon className="size-4 shrink-0" />
            <span>{m.settings_theme_dark()}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <IconSun className="size-4 shrink-0" />
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
