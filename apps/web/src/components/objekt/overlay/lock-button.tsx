import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $toggleObjektLock } from "@/lib/functions/collection";
import { track } from "@/lib/utils";
import { IconLoader2, IconLock, IconLockOpen } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { OverlayIcon, OverlayIconButton } from "./corner-overlay";

type Props = {
  tokenId: number;
  isLocked: boolean;
};

const route = getRouteApi("/@{$username}");

export default function LockObjekt({ tokenId, isLocked }: Props) {
  const queryClient = useQueryClient();
  const targetAccountOptions = route.useRouteContext({
    select: (context) => context.targetAccountOptions,
  });
  const mutation = useMutation({
    mutationFn: $toggleObjektLock,
    onSuccess: (_result, { data }) => {
      track(`${data.lock ? "lock" : "unlock"}-objekt`);
      queryClient.setQueryData(targetAccountOptions.queryKey, (target) => {
        if (target === undefined) return target;
        const others = target.lockedObjekts.filter((id) => id !== tokenId);
        return {
          ...target,
          lockedObjekts: data.lock ? [...others, tokenId] : others,
        };
      });
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
