import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/i18n/messages";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { shortAddress } from "@apollo/util";
import { Suspense } from "react";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import DeleteAccount from "./account/delete-account";
import LinkedAccounts from "./account/linked-accounts";
import Profile from "./account/profile";
import LinkCosmo from "./link-cosmo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cosmo?: PublicCosmo;
};

export default function AccountDialog({ open, onOpenChange, cosmo }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.common_account()}</DialogTitle>
          <DialogDescription>{m.account_description()}</DialogDescription>
        </DialogHeader>

        <div className="-mx-6 flex min-h-0 flex-col gap-4 overflow-y-auto px-6">
          <Suspense fallback={<Skeleton className="h-[211px] w-full" />}>
            <Profile />
          </Suspense>

          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">{m.auth_sign_in()}</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              {m.linked_accounts_resign_in_notice()}
            </p>
            <Suspense
              fallback={
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              }
            >
              <LinkedAccounts />
            </Suspense>
          </div>

          <Separator />

          <div className="flex items-center gap-2.5">
            {cosmo === undefined ? (
              <LinkCosmo />
            ) : (
              <>
                <img
                  className="size-7 shrink-0 rounded-sm"
                  src="/cosmo.webp"
                  alt={m.common_cosmo()}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{cosmo.username}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {shortAddress(cosmo.address)}
                  </span>
                </div>
              </>
            )}
          </div>

          <DeleteAccount />
        </div>
      </DialogContent>
    </Dialog>
  );
}
