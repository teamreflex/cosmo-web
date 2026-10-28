import { StatCell } from "@/components/ui/stat-cell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import { lazyWithPreload } from "@/lib/lazy";
import {
  objektMetadataQuery,
  objektPriceHistoryQuery,
} from "@/lib/queries/objekt-queries";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { defaultPriceHistoryRange } from "@/lib/universal/objekts";
import { noop, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import LazyFallback from "../../lazy-fallback";
import type { ObjektMetadataTab } from "./common";
import SerialsPanel from "./serials-panel";

/**
 * Tab panels mount only while active, so the price chart (and recharts with it) downloads when the pricing tab is
 * first hovered or opened.
 */
const PricingPanel = lazyWithPreload(() => import("./pricing-panel"));

type Props = {
  objekt: Objekt.Collection;
  tab: ObjektMetadataTab;
  setTab: (tab: ObjektMetadataTab) => void;
};

export default function Metadata(props: Props) {
  const { data } = useSuspenseQuery(objektMetadataQuery(props.objekt.slug));
  const queryClient = useQueryClient();

  // the chart's chunk and its data load side by side rather than one after the other
  function preloadPricing() {
    PricingPanel.preload();
    queryClient
      .query(
        objektPriceHistoryQuery(props.objekt.slug, defaultPriceHistoryRange),
      )
      .catch(noop);
  }

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
        // SAFETY: tab values are the ObjektMetadataTab variants
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
          {!data.unobtainable && (
            <TabsTrigger
              value="pricing"
              onPointerEnter={preloadPricing}
              onFocus={preloadPricing}
            >
              {m.objekt_metadata_pricing_tab()}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="metadata" className="flex flex-col px-4 py-3">
          {description !== null && (
            <p className="min-h-10 text-sm sm:text-base">{description}</p>
          )}
        </TabsContent>

        <TabsContent value="serials" className="px-4 py-3">
          <SerialsPanel slug={props.objekt.slug} />
        </TabsContent>

        {!data.unobtainable && (
          <TabsContent value="pricing">
            <Suspense
              fallback={
                <LazyFallback className="h-56 border-b border-border" />
              }
            >
              <PricingPanel slug={props.objekt.slug} data={data.priceStats} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
