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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
};

export default function AccountDialog({ open, onOpenChange, user }: Props) {
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

          <Separator className="my-2" />
          <DeleteAccount />
        </div>
      </DialogContent>
    </Dialog>
  );
}
