import { Loader2, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { $pinObjekt, $unpinObjekt } from "@/components/collection/actions";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";

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
  const mutationFn = useServerFn($pinObjekt);
  const mutation = useMutation({
    mutationFn,
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
    <button
      className="flex items-center transition-all hover:scale-110"
      disabled={mutation.isPending}
      aria-label={m.objekt_overlay_pin_aria({ collectionId: props.collectionId })}
      onClick={handleClick}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin sm:h-5 sm:w-5" />
      ) : (
        <Pin className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}

function UnpinButton(props: ButtonProps) {
  const removePin = useProfileContext((ctx) => ctx.removePin);
  const mutationFn = useServerFn($unpinObjekt);
  const mutation = useMutation({
    mutationFn,
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
    <button
      className="flex items-center transition-all hover:scale-110"
      disabled={mutation.isPending}
      aria-label={m.objekt_overlay_unpin_aria({ collectionId: props.collectionId })}
      onClick={handleClick}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin sm:h-5 sm:w-5" />
      ) : (
        <PinOff className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
