import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useObjektOverlay } from "@/store";
import RescanMetadata from "./rescan-metadata";
import { useUserState } from "@/hooks/use-user-state";

type Props = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

export default function InformationOverlay({ collection, token }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useUserState();
  const isHidden = useObjektOverlay((state) => state.isHidden);

  // safari 15 doesn't like to parse the date string for some reason
  const formatted = useMemo(() => {
    try {
      return format(new Date(token.acquiredAt), "dd/MM/yy h:mmaa");
    } catch (error) {
      return token.acquiredAt;
    }
  }, [token.acquiredAt]);

  return (
    <div
      data-open={open}
      className={cn(
        "absolute isolate bottom-0 left-0 p-1 sm:p-2 rounded-tr-lg sm:rounded-tr-xl flex gap-2 group h-5 sm:h-9 w-5 sm:w-9 transition-all overflow-hidden",
        "text-(--objekt-text-color) bg-(--objekt-background-color)",
        "data-[open=true]:w-20 sm:data-[open=true]:w-32 data-[open=true]:h-32 sm:data-[open=true]:h-32",
        isHidden && "hidden"
      )}
    >
      <button
        className="z-50 hover:scale-110 transition-all flex items-center place-self-end"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Maximize2 className="h-3 w-3 sm:h-5 sm:w-5" />
      </button>

      <div className="z-40 absolute flex flex-col gap-1 group-data-[open=false]:opacity-0 group-data-[open=true]:opacity-100 transition-all">
        {user !== undefined && (
          <RescanMetadata collection={collection} token={token} />
        )}

        <div className="flex flex-col text-xs">
          <span className="font-semibold">Token ID</span>
          <span>{token.tokenId}</span>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">Received</span>
          <span>{formatted}</span>
        </div>
      </div>
    </div>
  );
}
