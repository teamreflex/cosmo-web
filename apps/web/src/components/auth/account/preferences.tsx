import { DataSourceSelector } from "@/components/collection/data-source-selector";
import CurrencySelect from "@/components/misc/currency-select";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { m } from "@/i18n/messages";
import { getLocale, locales, setLocale } from "@/i18n/runtime";
import { formatError } from "@/lib/client/errors";
import { $updateSettings } from "@/lib/functions/auth";
import { currentAccountQuery } from "@/lib/queries/core";
import type { CurrentUser } from "@/lib/universal/auth";
import { localeNames } from "@/lib/universal/locales";
import { settingsSchema } from "@/lib/universal/schema/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AccountRow, AccountSection } from "./account-section";

type Props = {
  user: CurrentUser;
};

/**
 * Language and theme apply as soon as they're picked; the account-backed
 * settings save together.
 */
export default function PreferencesSection({ user }: Props) {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: $updateSettings,
  });

  const locale = getLocale();
  const languageItems = locales.map((value) => ({
    value,
    label: localeNames[value],
  }));

  const themeItems = [
    { value: "dark", label: m.settings_theme_dark() },
    { value: "light", label: m.settings_theme_light() },
  ] satisfies { value: Theme; label: string }[];

  const columnItems = ["4", "5", "6", "7", "8"].map((count) => ({
    value: count,
    label: m.settings_columns_count({ count }),
  }));

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: standardSchemaResolver(settingsSchema),
    defaultValues: {
      gridColumns: user.gridColumns,
      collectionMode: user.collectionMode,
      currency: user.currency,
    },
  });

  async function handleSubmit(data: z.infer<typeof settingsSchema>) {
    await mutation.mutateAsync(
      { data },
      {
        async onSuccess() {
          toast.success(m.auth_settings_updated());
          form.reset(data);
          await queryClient.invalidateQueries({
            queryKey: currentAccountQuery.queryKey,
          });
          await router.invalidate();
        },
        onError(error) {
          toast.error(formatError(error));
        },
      },
    );
  }

  return (
    <AccountSection
      id="preferences"
      title={m.account_section_preferences()}
      description={m.settings_description()}
    >
      <AccountRow
        label={
          <label htmlFor="settings-language">{m.settings_language()}</label>
        }
        description={m.settings_language_description()}
      >
        <Select
          name="language"
          items={languageItems}
          defaultValue={locale}
          // re-picking the current language would reload the page for nothing
          onValueChange={(value) => {
            if (value !== null && value !== locale) void setLocale(value);
          }}
        >
          <SelectTrigger id="settings-language" className="w-full sm:w-56">
            <SelectValue placeholder={m.settings_language()} />
          </SelectTrigger>
          <SelectContent>
            {languageItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span lang={item.value}>{item.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AccountRow>

      <AccountRow
        label={<label htmlFor="settings-theme">{m.settings_theme()}</label>}
        description={m.settings_theme_description()}
      >
        <Select
          name="theme"
          items={themeItems}
          defaultValue={theme}
          onValueChange={(value) => {
            if (value !== null) setTheme(value);
          }}
        >
          <SelectTrigger id="settings-theme" className="w-full sm:w-56">
            <SelectValue placeholder={m.settings_theme()} />
          </SelectTrigger>
          <SelectContent>
            {themeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AccountRow>

      <form id="settings-form" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="divide-y divide-border">
          <Controller
            control={form.control}
            name="gridColumns"
            render={({ field, fieldState }) => (
              <AccountRow
                label={
                  <label htmlFor="settings-columns">
                    {m.settings_objekt_columns()}
                  </label>
                }
                description={m.settings_objekt_columns_description()}
              >
                <Select
                  name="gridColumns"
                  items={columnItems}
                  onValueChange={(value) => {
                    if (value !== null) field.onChange(value);
                  }}
                  defaultValue={field.value.toString()}
                >
                  <SelectTrigger
                    id="settings-columns"
                    className="w-full sm:w-56"
                  >
                    <SelectValue placeholder={m.settings_objekt_columns()} />
                  </SelectTrigger>
                  <SelectContent>
                    {columnItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </AccountRow>
            )}
          />

          <Controller
            control={form.control}
            name="currency"
            render={({ field, fieldState }) => (
              <AccountRow
                label={
                  <label htmlFor="settings-currency">
                    {m.settings_currency()}
                  </label>
                }
                description={m.settings_currency_description()}
              >
                <CurrencySelect
                  id="settings-currency"
                  name="currency"
                  value={field.value}
                  onValueChange={field.onChange}
                  className="w-full sm:w-56"
                />
                <FieldError errors={[fieldState.error]} />
              </AccountRow>
            )}
          />

          <Controller
            control={form.control}
            name="collectionMode"
            render={({ field, fieldState }) => (
              <AccountRow
                label={
                  <label htmlFor="settings-collection-mode">
                    {m.settings_collection_mode()}
                  </label>
                }
                description={m.settings_collection_mode_description()}
              >
                <DataSourceSelector
                  id="settings-collection-mode"
                  name="collectionMode"
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                />
                <FieldError errors={[fieldState.error]} />
              </AccountRow>
            )}
          />
        </div>

        <div className="flex justify-end border-t border-border px-4 py-4 sm:px-6">
          <Button
            type="submit"
            disabled={mutation.isPending || !form.formState.isDirty}
          >
            <span>{m.common_save()}</span>
            {mutation.isPending && (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            )}
          </Button>
        </div>
      </form>
    </AccountSection>
  );
}
