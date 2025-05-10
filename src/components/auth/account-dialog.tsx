import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "../ui/separator";
import { Suspense } from "react";
import Skeleton from "../skeleton/skeleton";
import LinkedAccounts from "./account/linked-accounts";
import Profile from "./account/profile";
import { PublicUser } from "@/lib/universal/auth";
import DeleteAccount from "./account/delete-account";
import LinkCosmo from "./link-cosmo";
import { Button } from "../ui/button";
import Image from "next/image";
import CosmoLogo from "@/assets/cosmo.webp";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
  cosmo?: PublicCosmo;
};

export default function AccountDialog({
  open,
  onOpenChange,
  user,
  cosmo,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your account here.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<Skeleton className="w-full h-9" />}>
            <Profile user={user} />
          </Suspense>

          <Separator className="my-2" />
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">Linked Accounts</h3>
            <Suspense fallback={<Skeleton className="w-full h-9" />}>
              <LinkedAccounts />
            </Suspense>
          </div>

          <Separator className="mb-2" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cosmo === undefined ? (
                <LinkCosmo>
                  <Button variant="cosmo">
                    <Image
                      className="rounded-full"
                      src={CosmoLogo.src}
                      alt="COSMO"
                      width={20}
                      height={20}
                    />
                    <span>Link COSMO</span>
                  </Button>
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
