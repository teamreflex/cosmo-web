import { Loader2, Lock, Unlock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { $toggleObjektLock } from "@/components/collection/actions";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";

type Props = {
  tokenId: number;
  isLocked: boolean;
};

export default function LockObjekt({ tokenId, isLocked }: Props) {
  const toggleLock = useProfileContext((ctx) => ctx.toggleLock);
  const mutationFn = useServerFn($toggleObjektLock);
  const mutation = useMutation({
    mutationFn,
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
      className="flex items-center transition-all hover:scale-110"
      disabled={mutation.isPending}
      aria-label={
        isLocked ? m.objekt_overlay_unlock_aria() : m.objekt_overlay_lock_aria()
      }
      onClick={toggle}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin sm:h-5 sm:w-5" />
      ) : isLocked ? (
        <Lock className="h-3 w-3 sm:h-5 sm:w-5" />
      ) : (
        <Unlock className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
