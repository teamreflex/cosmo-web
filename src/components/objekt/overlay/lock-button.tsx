import { Loader2, Lock, Unlock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toggleObjektLock } from "@/components/collection/actions";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";

type Props = {
  tokenId: number;
  isLocked: boolean;
};

export default function LockObjekt({ tokenId, isLocked }: Props) {
  const toggleLock = useProfileContext((ctx) => ctx.toggleLock);
  const mutation = useMutation({
    mutationFn: toggleObjektLock,
    onSuccess: () => {
      track(`${isLocked ? "unlock" : "lock"}-objekt`);
      toggleLock(tokenId);
    },
  });

  function toggle() {
    mutation.mutate({ data: { tokenId, lock: !isLocked } });
  }

  return (
    <button
      className="hover:scale-110 transition-all flex items-center"
      disabled={mutation.isPending}
      aria-label={`${isLocked ? "unlock" : "lock"} this objekt`}
      onClick={toggle}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : isLocked ? (
        <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
