import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useObjektOverlay } from "@/store";
import { IconMaximize } from "@tabler/icons-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import RescanMetadata from "./rescan-metadata";

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
        "group absolute bottom-0 left-0 isolate flex h-5 w-5 gap-2 overflow-hidden rounded-tr-lg p-1 transition-all sm:h-9 sm:w-9 sm:rounded-tr-xl sm:p-2",
        "bg-(--objekt-background-color) text-(--objekt-text-color)",
        "data-[open=true]:h-32 data-[open=true]:w-20 sm:data-[open=true]:h-32 sm:data-[open=true]:w-32",
        isHidden && "hidden",
      )}
    >
      <button
        className="z-50 flex items-center place-self-end transition-all hover:scale-110"
        onClick={() => setOpen((prev) => !prev)}
      >
        <IconMaximize className="h-3 w-3 sm:h-5 sm:w-5" />
      </button>

      <div className="absolute z-40 flex flex-col gap-1 transition-all group-data-[open=false]:opacity-0 group-data-[open=true]:opacity-100">
        {user !== undefined && (
          <RescanMetadata collection={collection} token={token} />
        )}

        <div className="flex flex-col text-xs">
          <span className="font-semibold">{m.objekt_info_token_id()}</span>
          <span>{token.tokenId}</span>
        </div>

        <div className="flex flex-col text-xs">
          <span className="font-semibold">{m.common_received()}</span>
          <span>{formatted}</span>
        </div>
      </div>
    </div>
  );
}
