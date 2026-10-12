import UserCombobox from "@/components/admin/user-combobox";
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
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { env } from "@/lib/env/client";
import { $transferCosmoAccount } from "@/lib/functions/cosmo-transfer";
import { targetAccountQueryFilter } from "@/lib/queries/core";
import {
  cosmoTransferSourcesQuery,
  cosmoTransferTargetsQuery,
} from "@/lib/queries/cosmo-transfer";
import type {
  CosmoTransferSource,
  CosmoTransferTarget,
} from "@/lib/universal/cosmo-transfer";
import {
  type TransferCosmoAccount,
  transferCosmoAccountSchema,
} from "@/lib/universal/schema/cosmo-transfer";
import { shortAddress } from "@apollo/util";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const emptyForm = {
  address: "",
  fromUserId: "",
  toUserId: "",
} satisfies TransferCosmoAccount;

/**
 * Moves a COSMO account's link from the Apollo account that holds it to
 * another one without a link. From is found by COSMO username; To lists only
 * live users without a link, by Apollo username and id prefix.
 */
export default function MoveCosmoAccountDialog() {
  const fromId = useId();
  const toId = useId();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<CosmoTransferSource | null>(null);
  const [target, setTarget] = useState<CosmoTransferTarget | null>(null);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(transferCosmoAccountSchema),
    defaultValues: emptyForm,
  });

  const mutation = useMutation({
    mutationFn: ({ data }: { data: TransferCosmoAccount; to: string }) =>
      $transferCosmoAccount({ data }),
    onSuccess: async (moved, { to }) => {
      toast.success(
        m.admin_cosmo_move_success({ cosmo: moved.username, username: to }),
      );
      handleOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries(targetAccountQueryFilter),
        queryClient.invalidateQueries({ queryKey: ["admin"] }),
      ]);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset(emptyForm);
      setSource(null);
      setTarget(null);
      mutation.reset();
    }
  }

  function handleSubmit(data: TransferCosmoAccount) {
    // submit stays disabled until both sides are picked
    if (target !== null) {
      mutation.mutate({ data, to: target.username });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        {m.admin_cosmo_move_submit()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.admin_cosmo_move_title()}</DialogTitle>
          <DialogDescription>
            {source === null ? (
              m.admin_cosmo_move_description()
            ) : (
              <>
                {source.cosmoUsername} ·{" "}
                <span className="font-mono">
                  {shortAddress(source.address)}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fromUserId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={fromId}>
                    {m.admin_cosmo_move_from()}
                  </FieldLabel>
                  <UserCombobox
                    id={fromId}
                    value={source}
                    onChange={(picked) => {
                      setSource(picked);
                      field.onChange(picked?.ownerId ?? "");
                      form.setValue("address", picked?.address ?? "");
                    }}
                    search={cosmoTransferSourcesQuery}
                    getKey={(account) => account.address}
                    getLabel={(account) => `@${account.cosmoUsername}`}
                    getSublabel={(account) => shortAddress(account.address)}
                    getInitial={(account) =>
                      account.cosmoUsername.charAt(0).toUpperCase()
                    }
                    placeholder={m.admin_cosmo_move_from_placeholder()}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="toUserId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={toId}>
                    {m.admin_cosmo_move_to()}
                  </FieldLabel>
                  <UserCombobox
                    id={toId}
                    value={target}
                    onChange={(user) => {
                      setTarget(user);
                      field.onChange(user?.id ?? "");
                    }}
                    search={cosmoTransferTargetsQuery}
                    getKey={(user) => user.id}
                    getLabel={(user) => user.username}
                    getSublabel={(user) => user.id.slice(0, 8)}
                    getInitial={(user) => user.username.charAt(0).toUpperCase()}
                    placeholder={m.admin_cosmo_move_to_placeholder({
                      appName: env.VITE_APP_NAME,
                    })}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {m.admin_cosmo_move_note()}
          </p>
          <DialogFooter className="mt-2">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="max-sm:h-11"
                />
              }
            >
              {m.common_cancel()}
            </DialogClose>
            <Button
              type="submit"
              className="max-sm:h-11"
              disabled={
                mutation.isPending || source === null || target === null
              }
            >
              <span>{m.admin_cosmo_move_submit()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
