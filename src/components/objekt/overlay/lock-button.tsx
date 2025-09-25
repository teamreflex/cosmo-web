import { toggleObjektLock } from "@/components/collection/actions";
import { Loader2, Lock, Unlock } from "lucide-react";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { useAction } from "next-safe-action/hooks";

type Props = {
  tokenId: number;
  isLocked: boolean;
};

export default function LockObjekt({ tokenId, isLocked }: Props) {
  const toggleLock = useProfileContext((ctx) => ctx.toggleLock);
  const { execute, isPending } = useAction(toggleObjektLock, {
    onSuccess: () => {
      track(`${isLocked ? "unlock" : "lock"}-objekt`);
      toggleLock(tokenId);
    },
  });

  function toggle() {
    execute({ tokenId, lock: !isLocked });
  }

  return (
    <button
      className="hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label={`${isLocked ? "unlock" : "lock"} this objekt`}
      onClick={toggle}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : isLocked ? (
        <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
