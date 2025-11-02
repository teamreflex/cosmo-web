import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { $rescanObjektMetadata } from "../actions";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { m } from "@/i18n/messages";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function RescanMetadata({ collection, token }: Props) {
  const mutationFn = useServerFn($rescanObjektMetadata);
  const mutation = useMutation({
    mutationFn,
    onSuccess() {
      toast.success(m.objekt_rescan_success(), {
        description: m.objekt_rescan_success_desc({ 
          collectionId: collection.collectionId, 
          serial: token.serial.toString() 
        }),
      });
    },
    onError() {
      toast.error(m.objekt_rescan_error(), {
        description: m.objekt_rescan_error_desc({ 
          collectionId: collection.collectionId, 
          serial: token.serial.toString() 
        }),
      });
    },
  });

  function handleClick() {
    mutation.mutate({ data: { tokenId: token.tokenId.toString() } });
  }

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      className="group/button flex items-center gap-1 text-xs underline"
    >
      <RefreshCcw className="size-3 group-disabled/button:animate-spin" />
      <span>{m.objekt_info_rescan()}</span>
    </button>
  );
}
