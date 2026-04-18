import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { objektQuery } from "@/lib/queries/objekt-queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ObjektSidebar } from "../common";
import FlippableObjekt from "../objekt-flippable";
import AttributePanel from "./attribute-panel";
import type { ObjektMetadataTab } from "./common";
import MetadataFooter from "./metadata-footer";
import MetadataPanel from "./metadata-panel";

type Props = {
  slug: string;
};

export default function MetadataContent(props: Props) {
  const { data } = useSuspenseQuery(objektQuery(props.slug));
  const { serial } = useObjektSerial();
  const [tab, setTab] = useState<ObjektMetadataTab>(() =>
    serial !== undefined ? "serials" : "metadata",
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll">
        {/* card */}
        <div
          className="flex shrink-0 items-center justify-center border-b border-border p-6"
          style={{
            background: `radial-gradient(600px 300px at 50% 30%, ${data.backgroundColor}22, transparent 70%)`,
          }}
        >
          <div className="w-full max-w-[280px]">
            <FlippableObjekt collection={data}>
              <ObjektSidebar collection={data} />
            </FlippableObjekt>
          </div>
        </div>

        {/* attributes */}
        <AttributePanel objekt={data} />

        {/* stats + tabs — suspended for metadata query */}
        <MetadataPanel objekt={data} tab={tab} setTab={setTab} />
      </div>

      <MetadataFooter objekt={data} />
    </div>
  );
}
