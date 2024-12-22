import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { UserState } from "@/hooks/use-wallet";
import { MutationStatus } from "@tanstack/react-query";
import { LuCircleCheck, LuHeartCrack } from "react-icons/lu";
import { TbLoader2 } from "react-icons/tb";
import Link from "next/link";

type Props = {
  user: UserState;
  status: MutationStatus;
};

export default function DecryptWallet({ user, status }: Props) {
  switch (status) {
    case "pending":
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <TbLoader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-semibold text-center">
            Loading account...
          </p>
        </div>
      );
    case "error":
      return (
        <div className="flex flex-col items-center justify-center gap-2 [&>p]:text-sm [&>p]:font-semibold [&>p]:text-center">
          <LuHeartCrack className="w-8 h-8 animate-spin" />
          <p>There was an error loading your account.</p>
          <p>
            You are signed into COSMO, however objekt sending will not work.
          </p>

          <Portal to="#sign-in-footer">
            <Button type="button" asChild>
              <Link href={`/@${user.nickname}`}>Continue</Link>
            </Button>
          </Portal>
        </div>
      );
    case "success":
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <LuCircleCheck className="w-8 h-8" />
          <p className="text-sm font-semibold text-center">
            Redirecting to your profile!
          </p>
        </div>
      );
  }
}
