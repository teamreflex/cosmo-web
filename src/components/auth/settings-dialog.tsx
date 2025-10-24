import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import { $updateSettings } from "./actions";
import type { PublicUser } from "@/lib/universal/auth";
import type { z } from "zod";
import { settingsSchema } from "@/lib/universal/schema/auth";
import { DataSourceSelector } from "@/components/collection/data-source-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { currentAccountQuery } from "@/lib/queries/core";

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
          toast.success("Settings updated.");
          onOpenChange(false);
          await queryClient.invalidateQueries({
            queryKey: currentAccountQuery.queryKey,
          });
          await router.invalidate();
        },
        onError() {
          toast.error("Error updating settings.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>General Settings</DialogTitle>
          <DialogDescription>
            Adjust any site-wide settings here.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="settings-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {/* theme */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <h2 className="col-span-3 text-sm font-semibold">Theme</h2>
                <p className="col-span-3 col-start-1 row-span-2 text-xs opacity-80">
                  Theme of the site.
                </p>
              </div>

              <Select
                name="theme"
                defaultValue={theme}
                onValueChange={(value) => setTheme(value)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* grid column size */}
            <FormField
              control={form.control}
              name="gridColumns"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <h2 className="col-span-3 text-sm font-semibold">
                          Objekt Columns
                        </h2>
                        <p className="col-span-3 col-start-1 row-span-3 row-start-2 text-xs opacity-80">
                          Number of columns to use when displaying objekts.
                        </p>
                      </div>

                      <Select
                        name="gridColumns"
                        onValueChange={field.onChange}
                        defaultValue={field.value.toString()}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Columns" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 Columns</SelectItem>
                          <SelectItem value="5">5 Columns</SelectItem>
                          <SelectItem value="6">6 Columns</SelectItem>
                          <SelectItem value="7">7 Columns</SelectItem>
                          <SelectItem value="8">8 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* collection mode */}
            <FormField
              control={form.control}
              name="collectionMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <h2 className="col-span-3 text-sm font-semibold">
                          Collection Mode
                        </h2>
                        <p className="col-span-3 col-start-1 row-span-3 row-start-2 text-xs opacity-80">
                          Mode to use when displaying your own collection.
                        </p>
                      </div>

                      <DataSourceSelector
                        name="collectionMode"
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            form="settings-form"
            type="submit"
            disabled={mutation.isPending}
          >
            <span>Save</span>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
