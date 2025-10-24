import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { $rescanObjektMetadata } from "../actions";
import type { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function RescanMetadata({ collection, token }: Props) {
  const mutationFn = useServerFn($rescanObjektMetadata);
  const mutation = useMutation({
    mutationFn,
    onSuccess() {
      toast.success("Objekt updated!", {
        description: `${collection.collectionId} #${token.serial} has been updated from COSMO.`,
      });
    },
    onError() {
      toast.error("Error", {
        description: `There was an error updating ${collection.collectionId} #${token.serial} from COSMO, please try again later.`,
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
      <span>Rescan</span>
    </button>
  );
}
