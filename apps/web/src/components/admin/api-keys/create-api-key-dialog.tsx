import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $createApiKey } from "@/lib/functions/api-keys";
import { apiKeysQuery } from "@/lib/queries/api-keys";
import type { UserSearchResult } from "@/lib/universal/api-keys";
import {
  type CreateApiKeyInput,
  createApiKeySchema,
} from "@/lib/universal/schema/api-keys";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconCopy, IconLoader2, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import UserCombobox from "./user-combobox";

const EXPIRY_OPTIONS = [
  { value: "none", days: null },
  { value: "30", days: 30 },
  { value: "90", days: 90 },
  { value: "365", days: 365 },
] as const;

export default function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(createApiKeySchema),
    defaultValues: { userId: "", name: "", expiresInDays: null },
  });

  const mutation = useMutation({
    mutationFn: $createApiKey,
    onSuccess: async (result) => {
      setCreatedKey(result.key);
      await queryClient.invalidateQueries({ queryKey: apiKeysQuery.queryKey });
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  function handleSelectUser(user: UserSearchResult | null) {
    setSelectedUser(user);
    form.setValue("userId", user?.id ?? "", { shouldValidate: true });
  }

  async function handleSubmit(data: CreateApiKeyInput) {
    await mutation.mutateAsync({ data });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
      setSelectedUser(null);
      setCreatedKey(null);
      mutation.reset();
    }
  }

  function copyKey() {
    if (createdKey) {
      void navigator.clipboard.writeText(createdKey);
      toast.success(m.admin_api_key_copied());
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          <span>{m.admin_api_keys_new()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>{m.admin_api_key_created_title()}</DialogTitle>
              <DialogDescription>
                {m.admin_api_key_created_description()}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={createdKey}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyKey}
                aria-label={m.admin_api_key_copy()}
              >
                <IconCopy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {m.common_done()}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{m.admin_api_keys_new()}</DialogTitle>
              <DialogDescription>
                {m.admin_api_key_create_description()}
              </DialogDescription>
            </DialogHeader>
            {/* oxlint-disable-next-line react/react-compiler */}
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col gap-4"
            >
              <Controller
                control={form.control}
                name="userId"
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{m.admin_api_key_user()}</FieldLabel>
                    <UserCombobox
                      value={selectedUser}
                      onChange={handleSelectUser}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="api-key-name">
                      {m.admin_api_key_name()}
                    </FieldLabel>
                    <Input id="api-key-name" {...field} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="expiresInDays"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{m.admin_api_key_expiry()}</FieldLabel>
                    <Select
                      value={
                        EXPIRY_OPTIONS.find((o) => o.days === field.value)
                          ?.value ?? "none"
                      }
                      onValueChange={(value) =>
                        field.onChange(
                          EXPIRY_OPTIONS.find((o) => o.value === value)?.days ??
                            null,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {m.admin_api_key_expiry_never()}
                        </SelectItem>
                        <SelectItem value="30">
                          {m.admin_api_key_expiry_days({ days: 30 })}
                        </SelectItem>
                        <SelectItem value="90">
                          {m.admin_api_key_expiry_days({ days: 90 })}
                        </SelectItem>
                        <SelectItem value="365">
                          {m.admin_api_key_expiry_days({ days: 365 })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <DialogFooter className="mt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {m.common_cancel()}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  <span>{m.common_create()}</span>
                  {mutation.isPending && (
                    <IconLoader2 className="animate-spin" />
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
