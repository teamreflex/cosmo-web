import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $toggleObjektLock } from "@/lib/functions/collection";
import { track } from "@/lib/utils";
import { IconLoader2, IconLock, IconLockOpen } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { OverlayIcon, OverlayIconButton } from "./corner-overlay";

type Props = {
  tokenId: number;
  isLocked: boolean;
};

export default function LockObjekt({ tokenId, isLocked }: Props) {
  const toggleLock = useProfileContext((ctx) => ctx.toggleLock);
  const mutation = useMutation({
    mutationFn: $toggleObjektLock,
    onSuccess: () => {
      track(`${isLocked ? "unlock" : "lock"}-objekt`);
      toggleLock(tokenId);
    },
    onError: (error) => toast.error(formatError(error)),
  });

  function toggle() {
    mutation.mutate({ data: { tokenId, lock: !isLocked } });
  }

  return (
    <OverlayIconButton
      disabled={mutation.isPending}
      aria-label={
        isLocked ? m.objekt_overlay_unlock_aria() : m.objekt_overlay_lock_aria()
      }
      onClick={toggle}
    >
      {mutation.isPending ? (
        <OverlayIcon icon={IconLoader2} className="animate-spin" />
      ) : (
        <OverlayIcon icon={isLocked ? IconLock : IconLockOpen} />
      )}
    </OverlayIconButton>
  );
}
