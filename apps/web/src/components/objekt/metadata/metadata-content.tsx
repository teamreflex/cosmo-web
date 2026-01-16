import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Separator } from "../../ui/separator";
import { ObjektSidebar } from "../common";
import FlippableObjekt from "../objekt-flippable";
import AttributePanel from "./attribute-panel";
import { fetchObjektQuery } from "./common";
import type { ObjektMetadataTab } from "./common";
import MetadataPanel from "./metadata-panel";

type Props = {
  slug: string;
};

export default function MetadataContent(props: Props) {
  const { data } = useSuspenseQuery(fetchObjektQuery(props.slug));
  const { serial } = useObjektSerial();
  const [tab, setTab] = useState<ObjektMetadataTab>(() =>
    serial !== undefined ? "serials" : "metadata",
  );

  return (
    <div className="contents">
      <div
        data-tab={tab}
        className={cn(
          // common
          "flex aspect-photocard shrink-0",
          // mobile
          "mx-auto mt-2 w-2/3 data-[tab=serials]:w-1/2",
          // desktop
          "md:mx-0 md:mt-0 md:h-[28rem] md:w-auto md:data-[tab=serials]:w-auto",
        )}
      >
        <FlippableObjekt collection={data}>
          <ObjektSidebar collection={data} />
        </FlippableObjekt>
      </div>

      <div className="mb-2 flex flex-col gap-2 overflow-y-auto sm:my-4 sm:overflow-y-hidden">
        <AttributePanel objekt={data} />
        <Separator orientation="horizontal" />
        <MetadataPanel objekt={data} tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}
