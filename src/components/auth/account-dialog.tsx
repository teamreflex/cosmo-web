import { Suspense, use } from "react";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import LinkedAccounts from "./account/linked-accounts";
import Profile from "./account/profile";
import DeleteAccount from "./account/delete-account";
import LinkCosmo, { LinkCosmoContext } from "./link-cosmo";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cosmo?: PublicCosmo;
};

export default function AccountDialog({ open, onOpenChange, cosmo }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your account here.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Suspense fallback={<Skeleton className="w-full h-[211px]" />}>
            <Profile />
          </Suspense>

          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">Sign In</h3>
            <Suspense
              fallback={
                <div className="flex flex-col gap-2">
                  <Skeleton className="w-full h-9" />
                  <Skeleton className="w-full h-9" />
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
                    className="rounded-full size-5 aspect-square"
                    src="/cosmo.webp"
                    alt="COSMO"
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
  const ctx = use(LinkCosmoContext);

  return (
    <Button variant="cosmo" onClick={() => ctx.setOpen(true)}>
      <img
        src="/cosmo.webp"
        alt="COSMO"
        className="rounded-full size-5 aspect-square"
      />
      <span>Link COSMO</span>
    </Button>
  );
}
