import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "../ui/separator";
import { Suspense, use } from "react";
import Skeleton from "../skeleton/skeleton";
import LinkedAccounts from "./account/linked-accounts";
import Profile from "./account/profile";
import DeleteAccount from "./account/delete-account";
import LinkCosmo, { LinkCosmoContext } from "./link-cosmo";
import { Button } from "../ui/button";
import Image from "next/image";
import CosmoLogo from "@/assets/cosmo.webp";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";

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
                  <Image
                    className="rounded-full"
                    src={CosmoLogo.src}
                    alt="COSMO"
                    width={20}
                    height={20}
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
      <Image
        className="rounded-full"
        src={CosmoLogo.src}
        alt="COSMO"
        width={20}
        height={20}
      />
      <span>Link COSMO</span>
    </Button>
  );
}
