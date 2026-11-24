import { m } from "@/i18n/messages";
import type { MyTradesPageTab, MyTradesTab } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import ListingFeedHeader from "../trade-listings/listing-feed-header";
import {
  ListingSlipFooter,
  Slip,
  SlipDivider,
  SlipFanCard,
  SlipFanFrame,
  SlipHalf,
  SlipItem,
  SlipItems,
  SlipList,
  TradeSlipFooter,
} from "../trade-listings/slip";
import { Skeleton } from "../ui/skeleton";
import MyTradesColumnHeader from "./my-trades-column-header";

/**
 * A My trades tab while its first page loads: the tab's column headings
 * over slips built from the same parts as its rows, each slot a block the
 * height of the text or badge it stands for.
 */
export default function MyTradesSkeleton({ tab }: { tab: MyTradesPageTab }) {
  return (
    <div className="relative">
      <SkeletonGradient />

      <SlipList className="relative">
        {tab === "listings" ? (
          <ListingFeedHeader end={m.my_listings_column_activity()} />
        ) : (
          <MyTradesColumnHeader tab={tab} />
        )}
        <SlipItems aria-hidden>
          {Array.from({ length: 6 }, (_, i) =>
            tab === "listings" ? (
              <ListingSlipSkeleton key={i} />
            ) : (
              <TradeSlipSkeleton key={i} tab={tab} />
            ),
          )}
        </SlipItems>
      </SlipList>
    </div>
  );
}

// the time is a countdown in text-sm on Active, a date in text-xs on Finished
function TradeSlipSkeleton({ tab }: { tab: MyTradesTab }) {
  return (
    <SlipItem>
      <Slip variant="trade">
        <HalfSkeleton side="give" />
        <SlipDivider />
        <HalfSkeleton side="get" />
        <TradeSlipFooter
          type={<BadgeSkeleton className="w-14" />}
          status={<BadgeSkeleton className="w-24" />}
          party={
            <>
              <Skeleton className="size-4.5 shrink-0 rounded-full md:size-6" />
              {/* the footer's text is text-xs below md */}
              <span className="flex h-4 min-w-0 items-center md:h-5">
                <Skeleton className="h-3 w-24 md:h-3.5" />
              </span>
            </>
          }
          time={
            <span
              className={cn(
                "flex items-center",
                tab === "active" ? "h-5" : "h-4",
              )}
            >
              <Skeleton className="h-3 w-12" />
            </span>
          }
        />
      </Slip>
    </SlipItem>
  );
}

function ListingSlipSkeleton() {
  return (
    <SlipItem>
      <Slip variant="listing">
        <HalfSkeleton side="give" />
        <SlipDivider />
        <HalfSkeleton side="get" />
        <ListingSlipFooter
          types={<BadgeSkeleton className="w-14" />}
          time={
            <span className="flex h-4 items-center">
              <Skeleton className="h-3 w-8" />
            </span>
          }
          end={<BadgeSkeleton className="w-16" />}
        />
      </Slip>
    </SlipItem>
  );
}

// a fan's front card, then a line of chips
function HalfSkeleton({ side }: { side: "give" | "get" }) {
  return (
    <SlipHalf
      side={side}
      thumbs={
        <SlipFanFrame count={1}>
          <SlipFanCard index={0} render={<Skeleton />} />
        </SlipFanFrame>
      }
    >
      <Skeleton className="h-6 w-40 max-w-full rounded-full" />
    </SlipHalf>
  );
}

function BadgeSkeleton({ className }: { className: string }) {
  return <Skeleton className={cn("h-5 shrink-0 rounded-4xl", className)} />;
}
