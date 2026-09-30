import { Button } from "@/components/ui/button";
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
import { useTheme, type Theme } from "@/hooks/use-theme";
import { m } from "@/i18n/messages";
import { getLocale, setLocale } from "@/i18n/runtime";
import { IconLanguage, IconMoon, IconSun } from "@tabler/icons-react";

export default function GuestSettings() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={m.settings_language()}
          />
        }
      >
        <IconLanguage className="size-6" />
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
          // SAFETY: radio options only contain Theme values
          onValueChange={(value) => setTheme(value as Theme)}
        >
          <DropdownMenuRadioItem value="dark" closeOnClick>
            <IconMoon className="size-4 shrink-0" />
            <span>{m.settings_theme_dark()}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" closeOnClick>
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
    // SAFETY: radio options only contain valid locales
    void setLocale(value as typeof locale);
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{m.settings_language()}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={handleLanguageChange}
        >
          <DropdownMenuRadioItem value="en" closeOnClick>
            {m.settings_language_english()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ko" closeOnClick>
            {m.settings_language_korean()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ja" closeOnClick>
            {m.settings_language_japanese()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fr" closeOnClick>
            {m.settings_language_french()}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
