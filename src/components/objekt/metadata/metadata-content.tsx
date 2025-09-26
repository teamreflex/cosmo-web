import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Separator } from "../../ui/separator";
import { ObjektSidebar } from "../common";
import FlippableObjekt from "../objekt-flippable";
import AttributePanel from "./attribute-panel";
import { fetchObjektQuery } from "./common";
import MetadataPanel from "./metadata-panel";
import type { ObjektMetadataTab } from "./common";
import { cn } from "@/lib/utils";
import { useObjektSerial } from "@/hooks/use-objekt-serial";

type Props = {
  slug: string;
};

export default function MetadataContent(props: Props) {
  const { data } = useSuspenseQuery(fetchObjektQuery(props.slug));
  const { serial } = useObjektSerial();
  const [tab, setTab] = useState<ObjektMetadataTab>(() =>
    serial !== undefined ? "serials" : "metadata"
  );

  return (
    <div className="contents">
      <div
        data-tab={tab}
        className={cn(
          // common
          "flex shrink-0 aspect-photocard",
          // mobile
          "mt-2 mx-auto w-2/3 data-[tab=serials]:w-1/2",
          // desktop
          "md:mt-0 md:h-[28rem] md:mx-0 md:w-auto md:data-[tab=serials]:w-auto"
        )}
      >
        <FlippableObjekt collection={data}>
          <ObjektSidebar collection={data} />
        </FlippableObjekt>
      </div>

      <div className="flex flex-col gap-2 mb-2 sm:my-4 overflow-y-auto sm:overflow-y-hidden">
        <AttributePanel objekt={data} />
        <Separator orientation="horizontal" />
        <MetadataPanel objekt={data} tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}
