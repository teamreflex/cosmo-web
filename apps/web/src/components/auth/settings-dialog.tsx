import { DataSourceSelector } from "@/components/collection/data-source-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { m } from "@/i18n/messages";
import { getLocale, setLocale } from "@/i18n/runtime";
import { $updateSettings } from "@/lib/functions/auth";
import { currentAccountQuery } from "@/lib/queries/core";
import type { PublicUser } from "@/lib/universal/auth";
import { settingsSchema } from "@/lib/universal/schema/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
};

export default function SettingsDialog({ open, onOpenChange, user }: Props) {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: $updateSettings,
  });

  const locale = getLocale();
  const languageItems = [
    { value: "en", label: m.settings_language_english() },
    { value: "ko", label: m.settings_language_korean() },
    { value: "ja", label: m.settings_language_japanese() },
    { value: "fr", label: m.settings_language_french() },
  ] satisfies { value: typeof locale; label: string }[];

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
    },
  });

  async function handleSubmit(data: z.infer<typeof settingsSchema>) {
    await mutation.mutateAsync(
      { data },
      {
        async onSuccess() {
          toast.success(m.auth_settings_updated());
          onOpenChange(false);
          await queryClient.invalidateQueries({
            queryKey: currentAccountQuery.queryKey,
          });
          await router.invalidate();
        },
        onError() {
          toast.error(m.toast_metadata_update_failed());
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.settings_title()}</DialogTitle>
          <DialogDescription>{m.settings_description()}</DialogDescription>
        </DialogHeader>

        <form
          id="settings-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          {/* language */}
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{m.settings_language()}</FieldLabel>
              <p className="text-xs opacity-80">
                {m.settings_language_description()}
              </p>
            </FieldContent>

            <Select
              name="language"
              items={languageItems}
              defaultValue={locale}
              // re-picking the current language would reload the page for nothing
              onValueChange={(value) => {
                if (value !== null && value !== locale) void setLocale(value);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={m.settings_language()} />
              </SelectTrigger>
              <SelectContent align="end">
                {languageItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* theme */}
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{m.settings_theme()}</FieldLabel>
              <p className="text-xs opacity-80">
                {m.settings_theme_description()}
              </p>
            </FieldContent>

            <Select
              name="theme"
              items={themeItems}
              defaultValue={theme}
              onValueChange={(value) => {
                if (value !== null) setTheme(value);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={m.settings_theme()} />
              </SelectTrigger>
              <SelectContent align="end">
                {themeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* grid column size */}
          <Controller
            control={form.control}
            name="gridColumns"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel>{m.settings_objekt_columns()}</FieldLabel>
                  <p className="text-xs opacity-80">
                    {m.settings_objekt_columns_description()}
                  </p>
                </FieldContent>

                <Select
                  name="gridColumns"
                  items={columnItems}
                  onValueChange={(value) => {
                    if (value !== null) field.onChange(value);
                  }}
                  defaultValue={field.value.toString()}
                >
                  <SelectTrigger className="w-36">
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
              </Field>
            )}
          />

          {/* collection mode */}
          <Controller
            control={form.control}
            name="collectionMode"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel>{m.settings_collection_mode()}</FieldLabel>
                  <p className="text-xs opacity-80">
                    {m.settings_collection_mode_description()}
                  </p>
                </FieldContent>

                <DataSourceSelector
                  name="collectionMode"
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </form>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            form="settings-form"
            type="submit"
            disabled={mutation.isPending}
          >
            <span>{m.common_save()}</span>
            {mutation.isPending && (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
