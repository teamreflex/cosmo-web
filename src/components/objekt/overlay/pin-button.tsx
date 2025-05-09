"use client";

import { pinObjekt, unpinObjekt } from "@/components/collection/actions";
import { Loader2, Pin, PinOff } from "lucide-react";
import { track } from "@/lib/utils";
import { useProfileContext } from "@/hooks/use-profile";
import { toast } from "@/components/ui/use-toast";
import { useAction } from "next-safe-action/hooks";

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
  const { execute, isPending } = useAction(pinObjekt, {
    onSuccess: ({ data }) => {
      track("pin-objekt");
      addPin(data!);
      toast({
        description: `Pinned ${props.collectionId}`,
      });
    },
  });

  return (
    <button
      className="hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label={`Pin ${props.collectionId}`}
      onClick={() => execute({ tokenId: props.tokenId })}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <Pin className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}

function UnpinButton(props: ButtonProps) {
  const removePin = useProfileContext((ctx) => ctx.removePin);
  const { execute, isPending } = useAction(unpinObjekt, {
    onSuccess: () => {
      track("unpin-objekt");
      removePin(props.tokenId);
      toast({
        description: `Unpinned ${props.collectionId}`,
      });
    },
  });

  return (
    <button
      className="hover:scale-110 transition-all flex items-center"
      disabled={isPending}
      aria-label={`Unpin ${props.collectionId}`}
      onClick={() => execute({ tokenId: props.tokenId })}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <PinOff className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
