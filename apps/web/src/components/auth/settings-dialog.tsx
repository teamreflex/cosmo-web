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
import { m } from "@/i18n/messages";
import { getLocale, setLocale } from "@/i18n/runtime";
import { currentAccountQuery } from "@/lib/queries/core";
import type { PublicUser } from "@/lib/universal/auth";
import { settingsSchema } from "@/lib/universal/schema/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useTheme } from "../theme-provider";
import type { Theme } from "../theme-provider";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";
import { $updateSettings } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
};

export default function SettingsDialog({ open, onOpenChange, user }: Props) {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutationFn = useServerFn($updateSettings);
  const mutation = useMutation({
    mutationFn,
  });

  const locale = getLocale();

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

  function handleLanguageChange(value: string) {
    void setLocale(value as typeof locale);
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
              defaultValue={locale}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={m.settings_language()} />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="en">
                  {m.settings_language_english()}
                </SelectItem>
                <SelectItem value="ko">
                  {m.settings_language_korean()}
                </SelectItem>
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
              defaultValue={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={m.settings_theme()} />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="dark">{m.settings_theme_dark()}</SelectItem>
                <SelectItem value="light">
                  {m.settings_theme_light()}
                </SelectItem>
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
                  onValueChange={field.onChange}
                  defaultValue={field.value.toString()}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={m.settings_objekt_columns()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">
                      {m.settings_columns_count({ count: "4" })}
                    </SelectItem>
                    <SelectItem value="5">
                      {m.settings_columns_count({ count: "5" })}
                    </SelectItem>
                    <SelectItem value="6">
                      {m.settings_columns_count({ count: "6" })}
                    </SelectItem>
                    <SelectItem value="7">
                      {m.settings_columns_count({ count: "7" })}
                    </SelectItem>
                    <SelectItem value="8">
                      {m.settings_columns_count({ count: "8" })}
                    </SelectItem>
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
