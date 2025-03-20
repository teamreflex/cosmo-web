import Portal from "@/components/portal";
import { AlertDialogAction } from "@/components/ui/alert-dialog";
import { UserState } from "@/hooks/use-wallet";
import { MutationStatus } from "@tanstack/react-query";
import { CheckCircle, HeartCrack, Loader2 } from "lucide-react";
import Link from "next/link";
import { match, P } from "ts-pattern";

type Props = {
  user: UserState | undefined;
  status: MutationStatus;
};

export default function DecryptWallet({ user, status }: Props) {
  if (!user) return <Loading />;

  return match(status)
    .with(P.union("pending", "idle"), () => <Loading />)
    .with("error", () => (
      <div className="flex flex-col items-center justify-center gap-2 text-sm text-center">
        <HeartCrack className="w-8 h-8" />
        <p className="font-semibold">
          There was an error loading your account.
        </p>
        <p>
          You are signed in, however objekt sending & gravity voting will not
          work. There may be an issue with COSMO or your connection to sign-in
          services.
        </p>

        <Portal to="#sign-in-footer">
          <AlertDialogAction type="button" asChild>
            <Link href={`/@${user.nickname}`}>Continue</Link>
          </AlertDialogAction>
        </Portal>
      </div>
    ))
    .with("success", () => (
      <div className="flex flex-col items-center justify-center gap-2">
        <CheckCircle className="w-8 h-8" />
        <p className="text-sm font-semibold text-center">
          Redirecting to your profile!
        </p>
      </div>
    ))
    .exhaustive();
}

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm font-semibold text-center">Loading account...</p>
    </div>
  );
}
