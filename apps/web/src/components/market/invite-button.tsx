import CosmoUserCombobox from "@/components/auth/cosmo-user-combobox";
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
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { env } from "@/lib/env/client";
import { $inviteToMarket } from "@/lib/functions/market-invites";
import { currentAccountQuery } from "@/lib/queries/core";
import { marketInvitesLeftQuery } from "@/lib/queries/market-invites";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { IconLoader2, IconUserPlus } from "@tabler/icons-react";
import {
  useIsMutating,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useId, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

/**
 * Lets someone with market access make a user they know a tester while the
 * market is gated. Inviting needs a linked COSMO account, which staff can
 * be without, so they get no button. Phones get an icon.
 */
export default function InviteButton() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  return account?.cosmo !== undefined && <InviteDialog />;
}

const inviteMutationKey = ["market-invite"];

/**
 * The dialog stays open while the invite is in flight, so its result can't
 * land on a later pick.
 */
function InviteDialog() {
  const [open, setOpen] = useState(false);
  const pending = useIsMutating({ mutationKey: inviteMutationKey }) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={m.market_invite_button()}
            className="max-md:size-9 max-md:px-0"
          />
        }
      >
        <IconUserPlus className="md:hidden" />
        <span className="max-md:hidden">{m.market_invite_button()}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.market_invite_title()}</DialogTitle>
          <DialogDescription>
            {m.market_invite_description({ appName: env.VITE_APP_NAME })}
          </DialogDescription>
        </DialogHeader>
        <ErrorBoundary
          fallback={
            <p className="text-sm text-destructive">{m.error_unknown()}</p>
          }
        >
          <Suspense
            fallback={
              <div className="flex justify-center py-4">
                <IconLoader2 className="size-5 animate-spin" />
              </div>
            }
          >
            <InviteForm onDone={() => setOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The inviter finds the user through COSMO's own user search, and the server
 * decides whether that account can be invited. Mounted only while the dialog
 * is open, so the count is read on each opening and the pick starts empty.
 */
function InviteForm({ onDone }: { onDone: () => void }) {
  const accountId = useId();
  const queryClient = useQueryClient();
  const [account, setAccount] = useState<CosmoPublicUser | null>(null);
  const { data: left } = useSuspenseQuery(marketInvitesLeftQuery);

  const mutation = useMutation({
    mutationKey: inviteMutationKey,
    mutationFn: $inviteToMarket,
    onSuccess: onDone,
    onError: (error) => {
      toast.error(formatError(error));
    },
    // a refusal can mean another tab spent the last invite
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: marketInvitesLeftQuery.queryKey,
      });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (account !== null) {
          mutation.mutate(
            { data: { address: account.address } },
            {
              onSuccess: () => {
                toast.success(
                  m.market_invite_success({ username: account.nickname }),
                );
              },
            },
          );
        }
      }}
      className="flex flex-col gap-4"
    >
      <FieldSet disabled={mutation.isPending}>
        <Field>
          <FieldLabel htmlFor={accountId}>{m.market_invite_user()}</FieldLabel>
          {/* the artist only picks which profile image the results show */}
          <CosmoUserCombobox
            id={accountId}
            artistId="tripleS"
            value={account}
            onChange={setAccount}
            autoFocus
          />
        </Field>
      </FieldSet>
      <p className="text-sm text-muted-foreground">
        {m.market_invite_left({ count: left })}
      </p>
      <DialogFooter className="mt-2">
        <DialogClose
          render={
            <Button
              type="button"
              disabled={mutation.isPending}
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
          disabled={account === null || left === 0 || mutation.isPending}
        >
          <span>{m.market_invite_button()}</span>
          {mutation.isPending && <IconLoader2 className="animate-spin" />}
        </Button>
      </DialogFooter>
    </form>
  );
}
