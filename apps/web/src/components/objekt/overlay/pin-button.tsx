import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { $pinObjekt, $unpinObjekt } from "@/lib/functions/collection";
import { track } from "@/lib/utils";
import { IconLoader2, IconPin, IconPinnedOff } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { OverlayIcon, OverlayIconButton } from "./corner-overlay";

type Props = {
  collectionId: string;
  tokenId: number;
  isPinned: boolean;
};

export default function PinObjekt({ collectionId, tokenId, isPinned }: Props) {
  return isPinned ? (
    <UnpinButton collectionId={collectionId} tokenId={tokenId} />
  ) : (
    <PinButton collectionId={collectionId} tokenId={tokenId} />
  );
}

type ButtonProps = {
  tokenId: number;
  collectionId: string;
};

function PinButton(props: ButtonProps) {
  const addPin = useProfileContext((ctx) => ctx.addPin);
  const mutation = useMutation({
    mutationFn: $pinObjekt,
    onSuccess: (data) => {
      track("pin-objekt");
      addPin(data);
      toast.success(m.toast_pinned({ collectionId: props.collectionId }));
    },
  });

  function handleClick() {
    mutation.mutate({ data: { tokenId: props.tokenId } });
  }

  return (
    <OverlayIconButton
      disabled={mutation.isPending}
      aria-label={m.objekt_overlay_pin_aria({
        collectionId: props.collectionId,
      })}
      onClick={handleClick}
    >
      {mutation.isPending ? (
        <OverlayIcon icon={IconLoader2} className="animate-spin" />
      ) : (
        <OverlayIcon icon={IconPin} />
      )}
    </OverlayIconButton>
  );
}

function UnpinButton(props: ButtonProps) {
  const removePin = useProfileContext((ctx) => ctx.removePin);
  const mutation = useMutation({
    mutationFn: $unpinObjekt,
    onSuccess: () => {
      track("unpin-objekt");
      removePin(props.tokenId);
      toast.success(m.toast_unpinned({ collectionId: props.collectionId }));
    },
  });

  function handleClick() {
    mutation.mutate({ data: { tokenId: props.tokenId } });
  }

  return (
    <OverlayIconButton
      disabled={mutation.isPending}
      aria-label={m.objekt_overlay_unpin_aria({
        collectionId: props.collectionId,
      })}
      onClick={handleClick}
    >
      {mutation.isPending ? (
        <OverlayIcon icon={IconLoader2} className="animate-spin" />
      ) : (
        <OverlayIcon icon={IconPinnedOff} />
      )}
    </OverlayIconButton>
  );
}
