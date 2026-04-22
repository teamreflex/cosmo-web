import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import { objektMetadataQuery } from "@/lib/queries/objekt-queries";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { StatCell, type ObjektMetadataTab } from "./common";
import PricingPanel from "./pricing-panel";
import SerialsPanel from "./serials-panel";

type Props = {
  objekt: Objekt.Collection;
  tab: ObjektMetadataTab;
  setTab: (tab: ObjektMetadataTab) => void;
};

export default function Metadata(props: Props) {
  const { data } = useSuspenseQuery(objektMetadataQuery(props.objekt.slug));

  const total = Number(data.total).toLocaleString();
  const description =
    data.data?.description ?? data.data?.event?.description ?? null;

  return (
    <div className="flex flex-col">
      {/* stats row */}
      <div className="flex items-stretch border-b border-border">
        <StatCell
          label={
            props.objekt.onOffline === "online"
              ? m.objekt_metadata_copies()
              : m.objekt_metadata_scanned_copies()
          }
          value={total}
          mono
        />
        <StatCell
          label={m.objekt_metadata_tradable()}
          value={`${data.percentage}%`}
          mono
        />
      </div>

      {/* tabs */}
      <Tabs
        value={props.tab}
        onValueChange={(value) => props.setTab(value as ObjektMetadataTab)}
        variant="navbar"
        className="flex flex-col gap-0"
      >
        <TabsList>
          <TabsTrigger value="metadata">
            {m.objekt_metadata_information()}
          </TabsTrigger>
          <TabsTrigger value="serials">
            {m.objekt_metadata_serials()}
          </TabsTrigger>
          <TabsTrigger value="pricing">
            {m.objekt_metadata_pricing_tab()}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="flex flex-col px-4 py-3">
          {description !== null && (
            <p className="min-h-10 text-sm sm:text-base">{description}</p>
          )}
        </TabsContent>

        <TabsContent value="serials" className="px-4 py-3">
          <SerialsPanel slug={props.objekt.slug} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingPanel data={data.priceStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
