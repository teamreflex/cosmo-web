import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Separator } from "../../ui/separator";
import { ObjektSidebar } from "../common";
import FlippableObjekt from "../objekt-flippable";
import AttributePanel from "./attribute-panel";
import { fetchObjektQuery } from "./common";
import MetadataPanel from "./metadata-panel";

type Props = {
  slug: string;
};

export default function MetadataContent(props: Props) {
  const { data } = useSuspenseQuery(fetchObjektQuery(props.slug));

  return (
    <div className="contents">
      <div
        className={cn(
          // common
          "flex shrink-0 aspect-photocard",
          // mobile
          "mt-2 mx-auto w-2/3",
          // desktop
          "md:mt-0 md:h-[28rem] md:mx-0 md:w-auto"
        )}
      >
        <FlippableObjekt collection={data}>
          <ObjektSidebar
            collection={data.collectionNo}
            artist={data.artist}
            member={data.member}
          />
        </FlippableObjekt>
      </div>

      <div className="flex flex-col gap-2 mb-2 sm:my-4">
        <AttributePanel objekt={data} />
        <Separator orientation="horizontal" />
        <MetadataPanel objekt={data} />
      </div>
    </div>
  );
}
