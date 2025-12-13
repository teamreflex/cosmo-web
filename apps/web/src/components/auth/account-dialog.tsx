import { Suspense } from "react";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import LinkedAccounts from "./account/linked-accounts";
import Profile from "./account/profile";
import DeleteAccount from "./account/delete-account";
import LinkCosmo, { useLinkCosmo } from "./link-cosmo";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/i18n/messages";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cosmo?: PublicCosmo;
};

export default function AccountDialog({ open, onOpenChange, cosmo }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{m.common_account()}</DialogTitle>
          <DialogDescription>{m.account_description()}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Suspense fallback={<Skeleton className="h-[211px] w-full" />}>
            <Profile />
          </Suspense>

          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">{m.auth_sign_in()}</h3>
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

          <Separator className="mb-2" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cosmo === undefined ? (
                <LinkCosmo>
                  <LinkCosmoButton />
                </LinkCosmo>
              ) : (
                <div className="flex items-center gap-2">
                  <img
                    className="aspect-square size-5 rounded-full"
                    src="/cosmo.webp"
                    alt={m.common_cosmo()}
                  />
                  <p className="text-sm">{cosmo.username}</p>
                </div>
              )}
            </div>
            <DeleteAccount />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkCosmoButton() {
  const ctx = useLinkCosmo();

  return (
    <Button variant="cosmo" onClick={() => ctx.setOpen(true)}>
      <img
        src="/cosmo.webp"
        alt={m.common_cosmo()}
        className="aspect-square size-5 rounded-full"
      />
      <span>{m.link_cosmo_title()}</span>
    </Button>
  );
}
