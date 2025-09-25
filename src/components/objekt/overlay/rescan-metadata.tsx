import { useAction } from "next-safe-action/hooks";
import { rescanObjektMetadata } from "../actions";
import { toast } from "sonner";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { RefreshCcw } from "lucide-react";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function RescanMetadata({ collection, token }: Props) {
  const { execute, isPending } = useAction(rescanObjektMetadata, {
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

  const handleClick = () => {
    execute({ tokenId: token.tokenId.toString() });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="group/button flex items-center gap-1 text-xs underline"
    >
      <RefreshCcw className="size-3 group-disabled/button:animate-spin" />
      <span>Rescan</span>
    </button>
  );
}
